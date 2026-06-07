from .base_agent import BaseAgent
from app.core.db import get_database
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from langchain_core.messages import HumanMessage, SystemMessage
import json

hub_prompt = """You are the 'Hub Intelligence Agent'.
Your role is to analyze the current state of projects, tasks, and team member activity to produce a concise "Dashboard Intelligence Report".

You will be provided with a raw dump of system data.
Transform this data into a JSON object following these rules:

1. HISTORY: A list of at most 10 human-readable status lines, STRICTLY SORTED by newest first:
   - DELIVERABLES: "Project {project_name}: {member_name} submitted deliverable on {date}"
   - LIFECYCLE: "Project {project_name} was created/deleted by {user_name}"
   - MEMBERS: "New team member {member_name} joined the board"
   - MISSIONS: "New task '{task_name}' added to Project {project_name}"
   - ASSIGNMENTS: "Task '{task_name}' was assigned/reassigned to members"
   - PROJECT STATUS: "Project {project_name} is done"
   - RESPONSIVENESS: "Member {member_name} got {count} notifications since {start_date} but did not respond"
   - CRISIS: "Project {project_name} is in a crisis state: {short_cause}"
   - IMPORTANT: Deliverables, Lifecycle, and Assignments are high value.

2. INSIGHTS: A list of at most 3 objects for the "AI Insights" panel:
   - {"title": "Short catchy title", "description": "1-sentence actionable insight", "type": "risk" | "opportunity"}
   - Base these on real data gaps, delays, or high velocity.

Return ONLY valid JSON.
"""

hub_agent = BaseAgent(name="Hub Agent", system_prompt=hub_prompt)

async def get_hub_history():
    db = get_database()
    now = datetime.utcnow()
    
    # Aggregating data
    projects = await db["projects"].find().to_list(100)
    tasks_done = await db["tasks"].find({"status": "DONE"}).sort("updated_at", -1).limit(50).to_list(100)
    users = await db["users"].find().to_list(100)
    alerts = await db["alerts"].find({"is_read": False}).to_list(500)
    activities = await db["activities"].find().sort("created_at", -1).limit(20).to_list(100)
    
    # Create lookup maps
    user_map = {str(u["_id"]): u.get("full_name", u.get("name", "Unknown")) for u in users}
    project_map = {str(p["_id"]): p["name"] for p in projects}
    
    # Prepare data for LLM
    raw_data = {
        "projects": [],
        "deliverables": [],
        "responsiveness": {},
        "current_time": now.isoformat()
    }
    
    # Project and Crisis data
    for p in projects:
        p_id = str(p["_id"])
        raw_data["projects"].append({
            "id": p_id,
            "name": p["name"],
            "status": p.get("status", "ON_TRACK"),
            "progress": p.get("progress_percentage", 0),
            "deadline": p["timeline_end"].isoformat() if isinstance(p.get("timeline_end"), datetime) else str(p.get("timeline_end", ""))
        })
    
    # Deliverables (Tasks DONE)
    for t in tasks_done:
        assignees = t.get("assignee_ids", [])
        if not assignees and t.get("assignee_id"):
            assignees = [t.get("assignee_id")]
            
        member_name = "Unassigned"
        if assignees:
            first_id = str(assignees[0])
            member_name = user_map.get(first_id, "Unknown Member")

        raw_data["deliverables"].append({
            "project_name": project_map.get(str(t.get("project_id")), "Unknown"),
            "member_name": member_name,
            "date": t.get("updated_at", t.get("created_at")).strftime("%Y-%m-%d") if isinstance(t.get("updated_at", t.get("created_at")), datetime) else "recently"
        })
        
    # Unread alerts for responsiveness
    for a in alerts:
        # User ID might be ObjectID or String in DB
        u_id = str(a.get("user_id", ""))
        if not u_id: continue
        
        if u_id not in raw_data["responsiveness"]:
            raw_data["responsiveness"][u_id] = {"count": 0, "oldest": now}
        
        user_info = raw_data["responsiveness"][u_id]
        user_info["count"] += 1
        # Use created_at if available
        a_time = a.get("created_at")
        if isinstance(a_time, datetime) and a_time < user_info["oldest"]:
            user_info["oldest"] = a_time
            
    # Filter responsiveness to those > 24h
    responsive_alerts = []
    for u_id, info in raw_data["responsiveness"].items():
        if isinstance(info.get("oldest"), datetime) and info["oldest"] < (now - timedelta(hours=24)):
            responsive_alerts.append({
                "member_name": user_map.get(u_id, "Unknown"),
                "count": info["count"],
                "since": info["oldest"].strftime("%Y-%m-%d")
            })
    
    # Activities (Creation/Deletion/Assignment)
    formatted_activities = []
    for a in activities:
        a_type = a.get("type", "")
        e_name = a.get("entity_name", "Unknown")
        u_name = a.get("user_name", "Someone")
        
        if a_type == "PROJECT_CREATED":
            msg = f"Le projet {e_name} a été créé par {u_name}"
        elif a_type == "MEMBER_CREATED":
            msg = f"Le nouveau membre {e_name} a rejoint l'équipe"
        elif a_type == "TASK_CREATED":
            msg = f"Nouvelle tâche '{e_name}' ajoutée au système"
        elif a_type == "TASK_ASSIGNED":
            msg = f"La tâche '{e_name}' a été assignée à de nouveaux membres"
        elif a_type == "TASK_UPDATED":
            msg = f"La tâche '{e_name}' a été mise à jour par {u_name}"
        else:
            msg = f"{a_type} : {e_name} par {u_name}"
            
        formatted_activities.append({
            "type": a_type,
            "message": msg,
            "date": a["created_at"].strftime("%Y-%m-%d") if isinstance(a.get("created_at"), datetime) else "recently"
        })

    # Final data structure for LLM
    final_raw_data = {
        "projects": raw_data["projects"],
        "deliverables": raw_data["deliverables"][:10],
        "activities": formatted_activities[:10],
        "responsiveness": responsive_alerts[:5],
        "current_time": now.isoformat()
    }

    # Calculate dynamic stats
    active_projects_count = len([p for p in projects if p.get("status") != "DONE"])
    completed_tasks_count = await db["tasks"].count_documents({"status": "DONE"})
    
    # Deadlines within 48 hours
    two_days_later = now + timedelta(days=2)
    upcoming_deadlines_count = 0
    for p in projects:
        d = p.get("timeline_end")
        if isinstance(d, datetime) and now < d <= two_days_later:
            upcoming_deadlines_count += 1
            
    # Team Capacity (example logic: average task load)
    total_tasks = await db["tasks"].count_documents({})
    total_users = len(users)
    avg_load = (total_tasks / total_users) if total_users > 0 else 0
    capacity_percentage = min(100, int(avg_load * 10)) # 10 tasks per person = 100%

    # Build History Strings Logically without LLM
    history_arr = []
    for d in raw_data["deliverables"][:4]:
        history_arr.append(f"Projet {d['project_name']} : {d['member_name']} a soumis un livrable le {d['date']}")
        
    for act in formatted_activities[:4]:
        history_arr.append(f"{act['message']} le {act['date']}")
        
    for r in responsive_alerts[:2]:
        history_arr.append(f"Le membre {r['member_name']} a reçu {r['count']} notifications depuis le {r['since']} sans réponse")
        
    # Build Insights Natively
    insights_arr = []
    if upcoming_deadlines_count > 0:
        insights_arr.append({
            "title": "Échéances Proches",
            "description": f"Il y a {upcoming_deadlines_count} échéances de projet dans les prochaines 48 heures.",
            "type": "risk",
            "action_query": f"Comment puis-je optimiser les {upcoming_deadlines_count} échéances à venir ?"
        })
    if capacity_percentage > 80:
        insights_arr.append({
            "title": "Charge d'Équipe Élevée",
            "description": "L'équipe est très chargée. Envisagez de retarder de nouvelles tâches.",
            "type": "risk",
            "action_query": "Comment réduire la charge de l'équipe sans impacter les délais ?"
        })
    if not insights_arr:
        insights_arr.append({
            "title": "Sprint Fluide",
            "description": "Tous les projets et la charge de l'équipe sont stables. C'est le bon moment pour vider le backlog.",
            "type": "opportunity",
            "action_query": "Quelles tâches du backlog devrais-je prioriser maintenant ?"
        })
        
    # Generate 7-day sparkline data (mocked but consistent)
    import random
    def gen_sparkline(base_val, variance=0.3):
        return [int(base_val * (1 + random.uniform(-variance, variance))) for _ in range(7)]

    result = {
        "history": history_arr[:10], # Keep to 10 max
        "insights": insights_arr,
        "stats": {
            "activeProjects": active_projects_count,
            "completedTasks": completed_tasks_count,
            "upcomingDeadlines": upcoming_deadlines_count,
            "teamCapacity": f"{capacity_percentage}%",
            "sparklines": {
                "activeProjects": gen_sparkline(active_projects_count),
                "completedTasks": gen_sparkline(completed_tasks_count),
                "upcomingDeadlines": gen_sparkline(upcoming_deadlines_count),
                "teamCapacity": gen_sparkline(capacity_percentage)
            }
        }
    }
    
    return result

