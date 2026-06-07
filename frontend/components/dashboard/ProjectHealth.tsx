"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";
import { AlertTriangle, TrendingDown, Clock, Users, Zap, Target, CheckCircle2, Activity, ChevronDown } from "lucide-react";
import { useThemeStore } from "@/lib/themeStore";

interface ProjectHealthData {
  overallScore: number;
  status: "EXCELLENT" | "ON_TRACK" | "AT_RISK" | "CRITICAL";
  risks: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    affectedProjects: number;
  }>;
  projectStats: {
    totalProjects: number;
    onTrack: number;
    atRisk: number;
    critical: number;
  };
  keyMetrics: {
    avgProgress: number;
    overdueTasksCount: number;
    upcomingDeadlines: number;
    teamCapacityUtilization: number;
  };
}

export default function ProjectHealth({ token }: { token: string }) {
  const { theme } = useThemeStore();
  const [health, setHealth] = useState<ProjectHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRisksModal, setShowRisksModal] = useState(false);

  useEffect(() => {
    const fetchProjectHealth = async () => {
      try {
        setError(null);
        const projectsRes = await axios.get(`${API_BASE_URL}/api/projects/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const projects = projectsRes.data || [];
        const allTasks: any[] = [];

        // Fetch tasks for each project
        for (const project of projects) {
          try {
            const tasksRes = await axios.get(
              `${API_BASE_URL}/api/tasks/project/${project.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            allTasks.push(...(tasksRes.data || []));
          } catch (err) {
            console.warn(`Failed to fetch tasks for project ${project.id}:`, err);
          }
        }

        // Analyze project health
        const healthData = analyzeProjectHealth(projects, allTasks);
        setHealth(healthData);
      } catch (err) {
        console.error("Failed to fetch project health:", err);
        setError("Unable to load project health data");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProjectHealth();
  }, [token]);

  const analyzeProjectHealth = (
    projects: any[],
    tasks: any[]
  ): ProjectHealthData => {
    const now = new Date();
    const risks: ProjectHealthData["risks"] = [];
    const projectStats = {
      totalProjects: projects.length,
      onTrack: 0,
      atRisk: 0,
      critical: 0,
    };

    let totalProgress = 0;
    let overdueTasksCount = 0;
    let upcomingDeadlines = 0;

    // Analyze each project
    projects.forEach((project) => {
      const projectId = project.id || project._id || "";
      const projectTasks = tasks.filter(
        (t) => (t.project_id === projectId || t.project_id === String(projectId))
      );
      let earnedPoints = 0;
      projectTasks.forEach(t => {
        if (t.status === "DONE") earnedPoints += 1;
        else if (t.status === "REVIEW") earnedPoints += 0.8;
        else if (t.status === "IN_PROGRESS" || t.status === "IN PROGRESS") earnedPoints += 0.5;
      });
      
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? (earnedPoints / totalTasks) * 100 : 0;

      totalProgress += progress;

      // Check for overdue tasks
      const projectOverdueTasks = projectTasks.filter((t) => {
        if (!t.due_date || t.status === "DONE") return false;
        return new Date(t.due_date) < now;
      });
      overdueTasksCount += projectOverdueTasks.length;

      // Check for upcoming deadlines
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingTasks = projectTasks.filter((t) => {
        if (!t.due_date || t.status === "DONE") return false;
        const dueDate = new Date(t.due_date);
        return dueDate >= now && dueDate <= weekFromNow;
      });
      upcomingDeadlines += upcomingTasks.length;

      // Determine project status
      let projectStatus = "ON_TRACK";
      if (projectOverdueTasks.length > 0) {
        projectStatus = projectOverdueTasks.length > 2 ? "CRITICAL" : "AT_RISK";
      } else if (progress < 25 && project.status !== "PLANNING") {
        projectStatus = "AT_RISK";
      }

      if (projectStatus === "ON_TRACK") projectStats.onTrack++;
      else if (projectStatus === "AT_RISK") projectStats.atRisk++;
      else projectStats.critical++;

      // Task overload detection
      const activeTeam = project.team_members?.length || 1;
      const taskPerMember = projectTasks.length / activeTeam;
      if (taskPerMember > 8) {
        const existing = risks.find((r) => r.type === "SURCHARGE DE TÂCHES");
        if (existing) {
          existing.affectedProjects++;
        } else {
          risks.push({
            type: "SURCHARGE DE TÂCHES",
            severity: taskPerMember > 15 ? "critical" : "high",
            message: `${project.name} : ${taskPerMember.toFixed(1)} tâches/membre (surcharge élevée)`,
            affectedProjects: 1,
          });
        }
      }

      // Deadline risk
      if (project.timeline_end) {
        const daysLeft =
          (new Date(project.timeline_end).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysLeft <= 7 && progress < 80) {
          risks.push({
            type: "RISQUE DE DÉLAI",
            severity: daysLeft <= 2 ? "critical" : "high",
            message: `${project.name} : Plus que ${Math.ceil(daysLeft)} jours, ${Math.round(100 - progress)}% du travail en attente`,
            affectedProjects: 1,
          });
        }
      }

      // Progress stagnation
      if (progress < 30 && projectTasks.length > 5) {
        risks.push({
          type: "STAGNATION",
          severity: "medium",
          message: `${project.name} : Progression faible (${Math.round(progress)}%) avec beaucoup de tâches en attente`,
          affectedProjects: 1,
        });
      }
    });

    const avgProgress = projects.length > 0 ? totalProgress / projects.length : 0;
    const teamCapacity = projects.length > 0 ? 100 - (overdueTasksCount / Math.max(1, tasks.length)) * 50 : 100;

    // Calculate overall score (0-100)
    let overallScore = 100;
    overallScore -= overdueTasksCount * 5;
    overallScore -= projectStats.atRisk * 8;
    overallScore -= projectStats.critical * 15;
    overallScore += upcomingDeadlines > 0 ? -3 * upcomingDeadlines : 0;
    overallScore = Math.max(0, Math.min(100, overallScore));

    let status: ProjectHealthData["status"] = "EXCELLENT";
    if (overallScore >= 80) status = "EXCELLENT";
    else if (overallScore >= 60) status = "ON_TRACK";
    else if (overallScore >= 40) status = "AT_RISK";
    else status = "CRITICAL";

    // Deduplicate and prioritize risks
    const severityOrder: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 }
    const uniqueRisks = Array.from(
      new Map(risks.map((r) => [r.type, r])).values()
    ).sort(
      (a, b) =>
        (severityOrder[b.severity] ?? 0) -
        (severityOrder[a.severity] ?? 0)
    );

    return {
      overallScore,
      status,
      risks: uniqueRisks.slice(0, 3),
      projectStats,
      keyMetrics: {
        avgProgress: Math.round(avgProgress),
        overdueTasksCount,
        upcomingDeadlines,
        teamCapacityUtilization: Math.round(Math.min(100, teamCapacity)),
      },
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "EXCELLENT":
        return { text: "text-emerald-400", bg: "from-emerald-400 to-green-500", glow: "shadow-emerald-500/30" };
      case "ON_TRACK":
        return { text: "text-blue-400", bg: "from-blue-400 to-cyan-500", glow: "shadow-blue-500/30" };
      case "AT_RISK":
        return { text: "text-yellow-400", bg: "from-yellow-400 to-orange-500", glow: "shadow-yellow-500/30" };
      case "CRITICAL":
        return { text: "text-rose-400", bg: "from-rose-400 to-red-500", glow: "shadow-rose-500/30" };
      default:
        return { text: "text-cyan-400", bg: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/30" };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/30 border-rose-400/60 text-rose-300";
      case "high":
        return "bg-orange-500/30 border-orange-400/60 text-orange-300";
      case "medium":
        return "bg-yellow-500/30 border-yellow-400/60 text-yellow-300";
      case "low":
        return "bg-blue-500/30 border-blue-400/60 text-blue-300";
      default:
        return "bg-slate-500/30 border-slate-400/60 text-slate-300";
    }
  };

  if (loading) {
    return (
      <motion.div
        className={`relative p-6 rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center ${theme === "dark" ? "bg-gradient-to-br from-slate-900/50 to-slate-800/50" : "bg-white/50"
          }`}
      >
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-12 h-12 border-3 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto"
          />
          <p className="text-cyan-400 font-bold">Analyse de la santé du projet...</p>
        </div>
      </motion.div>
    );
  }

  if (error || !health) {
    return (
      <motion.div className={`relative p-6 rounded-2xl overflow-hidden border-2 ${theme === "dark" ? "border-red-500/30 bg-red-950/20" : "border-red-400/30 bg-red-50/50"}`}>
        <p className="text-red-400 font-bold text-center">{error || "Échec de l'analyse de la santé du projet"}</p>
      </motion.div>
    );
  }

  const statusColor = getStatusColor(health.status);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`relative overflow-hidden neon-box-cyan light-sweep-container flex-1 flex flex-col min-h-0 transition-all duration-300 rounded-[1.5rem] ${theme === "dark" ? "bg-slate-900/40 backdrop-blur-2xl" : "bg-white/40 backdrop-blur-2xl"
          } ${health.status === "CRITICAL" ? "border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
          }`}
      >
        {/* Background Animated Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ y: [0, -30, 0], x: [0, 20, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-10 w-12 h-12 rounded-full bg-cyan-400 blur-[20px]"
          />
          <motion.div
            animate={{ y: [0, 40, 0], x: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 right-10 w-16 h-16 rounded-full bg-red-500 blur-[25px]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-blue-400 blur-[60px]"
          />
        </div>

        <div
          className="relative z-10 p-6 flex flex-col h-full justify-start cursor-pointer group"
          onClick={() => setShowRisksModal(true)}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <motion.h2
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="text-xl font-black tracking-widest uppercase text-[#00BCD4] drop-shadow-[0_0_8px_rgba(0,188,212,0.4)]"
            >
              ÉTAT DES PROJETS
            </motion.h2>
            <motion.div
              whileHover={{ y: 3, scale: 1.1 }}
              className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"
            >
              <ChevronDown size={24} />
            </motion.div>
          </div>

          {/* Glowing Divider */}
          <div className="w-full h-[3px] bg-gradient-to-r from-cyan-400 via-red-500 to-transparent mb-4 relative rounded-full">
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-1/3 h-[8px] bg-cyan-400 blur-md opacity-80" />
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-1/4 h-[8px] bg-red-500 blur-md opacity-80" />
          </div>

          {/* AI Agent Analysis Banner */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative flex items-center gap-3 mb-4 px-3 py-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 overflow-hidden"
          >
            {/* Scanning line animation */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none"
            />

            {/* AI Icon pulsing */}
            <div className="relative flex-shrink-0 w-9 h-9 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-9 h-9 rounded-full bg-purple-400/10"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-8 h-8 rounded-full border border-dashed border-purple-400/40"
              />
              <svg width="18" height="18" viewBox="0 0 100 100" fill="none" className="relative z-10">
                <defs>
                  <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                {/* Head */}
                <circle cx="38" cy="22" r="13" stroke="url(#riskGrad)" strokeWidth="4" fill="none" />
                {/* Hair line */}
                <path d="M27 18 Q38 10 49 18" stroke="url(#riskGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                {/* Body / shoulders */}
                <path d="M15 80 Q15 58 38 55 Q61 58 61 80" stroke="url(#riskGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
                {/* Neck */}
                <path d="M33 34 Q33 42 38 44 Q43 42 43 34" stroke="url(#riskGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                {/* Magnifier circle */}
                <circle cx="68" cy="58" r="20" stroke="url(#riskGrad)" strokeWidth="4" fill="none" />
                {/* Magnifier handle */}
                <line x1="82" y1="72" x2="93" y2="85" stroke="url(#riskGrad)" strokeWidth="5" strokeLinecap="round" />
                {/* Exclamation mark body */}
                <line x1="68" y1="48" x2="68" y2="63" stroke="url(#riskGrad)" strokeWidth="4" strokeLinecap="round" />
                {/* Exclamation mark dot */}
                <circle cx="68" cy="69" r="2.5" fill="url(#riskGrad)" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#00BCD4] uppercase">Agent des Risques</span>
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex gap-[3px] items-center"
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400 block" />
                  <span className="w-1 h-1 rounded-full bg-cyan-400 block" />
                  <span className="w-1 h-1 rounded-full bg-cyan-400 block" />
                </motion.div>
              </div>
              <span className={`text-[11px] font-medium truncate ${theme === "dark" ? "text-slate-300" : "text-slate-500"}`}>
                {health.risks.length > 0
                  ? `${health.risks.length} risque${health.risks.length > 1 ? "s" : ""} détecté${health.risks.length > 1 ? "s" : ""} — intervention recommandée`
                  : health.keyMetrics.avgProgress === 0
                    ? "Aucun projet actif — en veille"
                    : health.keyMetrics.avgProgress >= 50
                      ? "Progression nominale — aucune anomalie"
                      : "Progression faible — surveillance active"}
              </span>
            </div>

            {/* Status dot */}
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`ml-auto flex-shrink-0 w-2 h-2 rounded-full ${health.risks.length > 0 ? "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                }`}
            />
          </motion.div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-row items-center justify-between px-2 gap-2">

            {/* Left: Glowing Circle */}
            <div className="relative w-28 h-28 flex-shrink-0 ml-2">
              {/* Background Particles/Dots */}
              <div className="absolute inset-0 rounded-full border-[2px] border-dashed border-cyan-400/40 animate-[spin_10s_linear_infinite]" />

              {/* Neon Rings */}
              <div className="absolute inset-[-6px] rounded-full border-[2px] border-transparent border-l-cyan-400 border-t-cyan-400 animate-[spin_3s_linear_infinite] shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              <div className="absolute inset-1 rounded-full border-[4px] border-cyan-400/20" />
              <div className="absolute inset-2 rounded-full border-t-[4px] border-l-[4px] border-cyan-400 animate-[spin_4s_linear_infinite] shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
              <div className="absolute inset-5 rounded-full border-b-[3px] border-r-[3px] border-red-500 animate-[spin_6s_linear_infinite_reverse] shadow-[0_0_15px_rgba(239,68,68,0.8)]" />

              {/* Score and text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-mono font-black tracking-tighter drop-shadow-[0_0_12px_rgba(34,211,238,1)] ${theme === "dark" ? "text-cyan-300" : "text-cyan-600"}`}>
                  {health.keyMetrics.avgProgress}%
                </span>
              </div>
            </div>

            {/* Right: List Items */}
            <div className="flex flex-col justify-center gap-4 flex-1 pl-6">
              {/* Item 1 - Cyan */}
              <div className="flex items-center gap-5">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)]" />
                  <div className="absolute w-[22px] h-[22px] rounded-full border-[2px] border-cyan-400 border-l-transparent animate-spin" />
                  <div className="absolute w-[22px] h-[22px] rounded-full border-[2px] border-cyan-400/20" />
                  <div className="absolute w-8 h-2 bg-cyan-400/40 blur-md" />
                </div>
                <span className={`text-[15px] font-bold tracking-wide drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] ${theme === "dark" ? "text-cyan-300" : "text-cyan-700"}`}>
                  {health.keyMetrics.overdueTasksCount === 0 ? "Dans les temps" : `${health.keyMetrics.overdueTasksCount} Retards`}
                </span>
              </div>

              {/* Item 2 - Red */}
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" />
                  <div className="absolute w-[22px] h-[22px] rounded-full border-[2px] border-red-500 border-r-transparent animate-[spin_2s_linear_infinite_reverse]" />
                  <div className="absolute w-[22px] h-[22px] rounded-full border-[2px] border-red-500/20" />
                  <div className="absolute w-8 h-2 bg-red-500/40 blur-md" />
                </div>
                <span className={`text-[15px] font-bold tracking-wide drop-shadow-[0_0_8px_rgba(239,68,68,0.4)] ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                  {health.risks.length === 0 ? "Aucun Blocage" : `${health.risks.length} Blocage${health.risks.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Item 3 - Yellow */}
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,1)]" />
                  <div className="absolute w-[22px] h-[22px] rounded-full border-[2px] border-yellow-400 border-b-transparent animate-[spin_3s_linear_infinite]" />
                  <div className="absolute w-[22px] h-[22px] rounded-full border-[2px] border-yellow-400/20" />
                  <div className="absolute w-8 h-2 bg-yellow-400/40 blur-md" />
                </div>
                <span className={`text-[15px] font-bold tracking-wide drop-shadow-[0_0_8px_rgba(250,204,21,0.4)] ${theme === "dark" ? "text-yellow-300" : "text-yellow-700"}`}>
                  Productivité {health.keyMetrics.avgProgress >= 50 ? "Haute" : health.keyMetrics.avgProgress >= 20 ? "Moyenne" : "Faible"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Risks Modal (Moved outside to prevent CSS transform / overflow-hidden clipping) */}
      {showRisksModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowRisksModal(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative max-w-2xl w-[90vw] max-h-[85vh] flex flex-col rounded-3xl border-2 shadow-2xl overflow-hidden ${theme === "dark"
                ? "bg-[#0f172a]/95 backdrop-blur-xl border-rose-500/40 shadow-[0_0_60px_rgba(244,63,94,0.3)]"
                : "bg-white/95 backdrop-blur-xl border-rose-400/40 shadow-[0_0_60px_rgba(244,63,94,0.2)]"
              }`}
          >
            {/* Close Button - Sticky/Fixed relative to container */}
            <div className="absolute top-4 right-4 z-50">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRisksModal(false)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme === "dark"
                    ? "bg-rose-950/80 hover:bg-rose-900 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-500/30"
                    : "bg-rose-100/80 hover:bg-rose-200 text-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.2)] border border-rose-400/30"
                  }`}
              >
                ✕
              </motion.button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-rose-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <AlertTriangle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className={`text-3xl font-black ${theme === "dark" ? "text-rose-300" : "text-rose-600"}`}>
                      RISQUES ACTIFS
                    </h2>
                    <p className={`text-sm font-bold ${theme === "dark" ? "text-rose-400/70" : "text-rose-500/70"}`}>
                      {health.risks.length} problème{health.risks.length !== 1 ? "s" : ""} critique{health.risks.length !== 1 ? "s" : ""} détecté{health.risks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className={`h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-red-600 rounded-full`} />
              </motion.div>

              {/* Risks List */}
              <div className="space-y-3">
                {health.risks.length > 0 ? (
                  health.risks.map((risk, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + idx * 0.1 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      className={`relative p-5 rounded-2xl border-2 backdrop-blur-sm transition-all duration-300 overflow-hidden group ${risk.severity === "critical"
                          ? "bg-rose-500/10 border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                          : risk.severity === "high"
                            ? "bg-orange-500/10 border-orange-500/50 hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]"
                            : risk.severity === "medium"
                              ? "bg-yellow-500/10 border-yellow-500/50 hover:shadow-[0_0_20px_rgba(202,138,4,0.4)]"
                              : "bg-blue-500/10 border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                        }`}
                    >
                      {/* Animated Background Glow */}
                      <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className={`absolute inset-0 ${risk.severity === "critical"
                            ? "bg-rose-500/20"
                            : risk.severity === "high"
                              ? "bg-orange-500/20"
                              : risk.severity === "medium"
                                ? "bg-yellow-500/20"
                                : "bg-blue-500/20"
                          }`}
                      />

                      <div className="relative z-10 flex items-start gap-3">
                        {/* Severity Icon */}
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className={`mt-0.5 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${risk.severity === "critical"
                              ? "bg-rose-600/60 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                              : risk.severity === "high"
                                ? "bg-orange-600/60 text-orange-100 shadow-[0_0_12px_rgba(234,88,12,0.6)]"
                                : risk.severity === "medium"
                                  ? "bg-yellow-600/60 text-yellow-100 shadow-[0_0_12px_rgba(202,138,4,0.6)]"
                                  : "bg-blue-600/60 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                            }`}
                        >
                          {risk.severity.toUpperCase().slice(0, 3)}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-black text-sm mb-1 tracking-wide ${risk.severity === "critical"
                              ? "text-rose-300"
                              : risk.severity === "high"
                                ? "text-orange-300"
                                : risk.severity === "medium"
                                  ? "text-yellow-300"
                                  : "text-blue-300"
                            }`}>
                            {risk.type.replace(/_/g, " ")}
                          </h3>
                          <p className={`text-xs leading-tight font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"
                            }`}>
                            {risk.message}
                          </p>
                        </div>

                        {/* Affected Badge */}
                        {risk.affectedProjects > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + idx * 0.1 }}
                            whileHover={{ scale: 1.1 }}
                            className={`px-2 py-0.5 rounded-lg text-[8px] font-black whitespace-nowrap flex-shrink-0 ${risk.severity === "critical"
                                ? "bg-rose-600/70 text-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                                : risk.severity === "high"
                                  ? "bg-orange-600/70 text-orange-100 shadow-[0_0_10px_rgba(234,88,12,0.8)]"
                                  : risk.severity === "medium"
                                    ? "bg-yellow-600/70 text-yellow-100 shadow-[0_0_10px_rgba(202,138,4,0.8)]"
                                    : "bg-blue-600/70 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                              }`}
                          >
                            ⚡ {risk.affectedProjects}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-center py-8 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                  >
                    <p className="text-base font-bold">Aucun risque actif détecté ! 🎉</p>
                  </motion.div>
                )}
              </div>

              {/* Footer Action */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 pt-6 border-t border-rose-500/20 flex items-center justify-between"
              >
                <div className={`text-xs font-bold flex items-center gap-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                  Dernière mise à jour : À l'instant
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(244,63,94,0.6)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRisksModal(false)}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all relative overflow-hidden"
                >
                  <span className="relative z-10">Fermer</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
