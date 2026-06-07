import React from 'react';
import { motion } from 'framer-motion';

interface RadarProps {
  cdcExtracted: Record<string, any>;
}

const ProjectHealthRadar: React.FC<RadarProps> = ({ cdcExtracted }) => {
  // 1. Data mapping
  const getConf = (key: string) => cdcExtracted?.[key]?.confidence || 0;
  
  const clarte = (getConf('project_name') + getConf('description')) / 2;
  const planning = getConf('deadline');
  const technique = getConf('stack');
  const equipe = getConf('team_size');
  const contraintes = getConf('constraints');

  const data = [
    { label: 'Clarté', value: clarte },
    { label: 'Planning', value: planning },
    { label: 'Technique', value: technique },
    { label: 'Équipe', value: equipe },
    { label: 'Contraintes', value: contraintes },
  ];

  // 2. SVG Geometry
  const size = 300;
  const center = size / 2;
  const radius = 100;
  const angleStep = (Math.PI * 2) / 5;

  const getCoordinatesForValue = (value: number, index: number) => {
    // Start at -90 degrees (top)
    const angle = -Math.PI / 2 + index * angleStep;
    // Map value (0-100) to radius
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate points for the background grid (3 levels)
  const gridLevels = [100, 66, 33];
  
  // Generate the actual data points
  const points = data.map((d, i) => getCoordinatesForValue(d.value, i));
  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  // Generate zero points for initial animation state (everything at center)
  const zeroPointsString = data.map(() => `${center},${center}`).join(' ');

  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_40px_rgba(34,211,238,0.1)] mb-8 flex flex-col items-center relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <h3 className="text-cyan-400 font-black text-sm tracking-widest uppercase mb-2 z-10">Santé du Projet</h3>
      
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible z-10">
        
        {/* Background Grid */}
        {gridLevels.map((level, levelIdx) => {
          const gridPoints = data.map((_, i) => getCoordinatesForValue(level, i));
          const path = gridPoints.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <polygon 
              key={`grid-${levelIdx}`}
              points={path} 
              fill="transparent" 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeWidth="1"
            />
          );
        })}

        {/* Axes lines */}
        {data.map((_, i) => {
          const outerPoint = getCoordinatesForValue(100, i);
          return (
            <line 
              key={`axis-${i}`}
              x1={center} 
              y1={center} 
              x2={outerPoint.x} 
              y2={outerPoint.y} 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeWidth="1"
            />
          );
        })}

        {/* The Animated Data Polygon */}
        <motion.polygon
          initial={{ points: zeroPointsString, fillOpacity: 0 }}
          animate={{ points: pointsString, fillOpacity: 0.3 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          fill="url(#cyanGradient)"
          stroke="#00BCD4"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 8px rgba(0, 188, 212, 0.5))" }}
        />

        {/* Data Points (Glowing Nodes) */}
        {points.map((p, i) => (
          <motion.circle
            key={`node-${i}`}
            initial={{ cx: center, cy: center, r: 0 }}
            animate={{ cx: p.x, cy: p.y, r: 4 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            fill="#FFFFFF"
            stroke="#00BCD4"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))" }}
          />
        ))}

        {/* Labels */}
        {data.map((d, i) => {
          // Push labels a bit further out than the 100% radius
          const labelPoint = getCoordinatesForValue(125, i);
          return (
            <text
              key={`label-${i}`}
              x={labelPoint.x}
              y={labelPoint.y}
              fill="currentColor"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-300"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.label}
            </text>
          );
        })}

        {/* SVG Defs for Gradients */}
        <defs>
          <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00BCD4" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.6} />
          </linearGradient>
        </defs>

      </svg>
    </div>
  );
};

export default ProjectHealthRadar;
