"use client"
import { API_BASE_URL } from "@/lib/api"

import { useEffect, useState, useCallback, useMemo } from "react"
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  BackgroundVariant
} from "reactflow"
import "reactflow/dist/style.css"

import IdeaNode from "@/components/kanban/IdeaNode"
import TaskDetailModal from "@/components/kanban/TaskDetailModal"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Lightbulb, RefreshCw, Plus } from "lucide-react"
import { useLang } from "@/lib/useLang"

const nodeTypes = {
  ideaNode: IdeaNode,
}

export default function IdeaTreePage() {
  const token = useAuthStore(state => state.token)
  const { t } = useLang()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedIdea, setSelectedIdea] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tasks/me/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/members/`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      const ideas = tasksRes.data || []
      setTeamMembers(usersRes.data || [])
      
      // Transform ideas into ReactFlow nodes and edges
      const newNodes = ideas.map((idea: any, index: number) => {
        // Simple layout: original ideas on left, ramifications on right
        const isChild = !!idea.parent_idea_id
        return {
          id: idea._id,
          type: 'ideaNode',
          data: { ...idea },
          position: isChild 
            ? { x: 400 + (index % 3) * 250, y: (index * 150) % 600 } 
            : { x: 50, y: index * 180 },
        }
      })

      const newEdges = ideas
        .filter((idea: any) => idea.parent_idea_id)
        .map((idea: any) => ({
          id: `e-${idea.parent_idea_id}-${idea._id}`,
          source: idea.parent_idea_id,
          target: idea._id,
          animated: true,
          style: { stroke: '#00BCD4', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#00BCD4',
          },
        }))

      setNodes(newNodes)
      setEdges(newEdges)
    } catch (err) {
      console.error("Error fetching ideas:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchData()
  }, [token])

  const onNodeClick = useCallback((event: any, node: any) => {
    setSelectedIdea(node.data)
    setIsModalOpen(true)
  }, [])

  const handleUpdateIdea = async (ideaId: string, updates: any) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/tasks/${ideaId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Refresh local state or just refetch
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm(t.tasks.deleteConfirm)) return
    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${ideaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchData()
      setIsModalOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-white/70 backdrop-blur-md p-4 px-6 rounded-3xl border border-white/40 shadow-xl pointer-events-auto flex items-center gap-4">
          <div className="p-3 bg-rose-100/50 rounded-2xl">
            <Lightbulb size={24} className="text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{t.tasks.title}</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t.tasks.subtitle}</p>
          </div>
        </div>

        <div className="flex gap-3 pointer-events-auto">
           <button 
             onClick={fetchData} 
             className="p-3 bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg text-slate-500 hover:text-rose-500 transition-all"
           >
             <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
           </button>
           <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all">
             <Plus size={20} />
             {t.tasks.newIdea}
           </button>
        </div>
      </div>

      {/* ReactFlow Canvas */}
      <div className="flex-1 w-full h-full bg-[#f8fafc]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-dot-pattern"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
          <Controls className="bg-white border-slate-200 rounded-xl shadow-lg mb-4" />
        </ReactFlow>
      </div>

      {selectedIdea && (
        <TaskDetailModal
          isOpen={isModalOpen}
          task={selectedIdea}
          teamMembers={teamMembers}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdateIdea}
          onDelete={handleDeleteIdea}
        />
      )}
      
      <style jsx global>{`
        .bg-dot-pattern {
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  )
}
