"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/store"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BookOpen, FileText, Calendar, ChevronRight } from "lucide-react"
import ReactMarkdown from 'react-markdown'

interface Specification {
  id: string
  project_title: string
  project_summary: string
  markdown_content: string
  methodology: string
  created_at: string
}

export default function SpecificationsPage() {
  const [specs, setSpecs] = useState<Specification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSpec, setSelectedSpec] = useState<Specification | null>(null)
  const token = useAuthStore(state => state.token)

  const fetchSpecs = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/specifications/", {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setSpecs(res.data)
    } catch (err) {
      console.error("Failed to fetch specifications", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchSpecs()
  }, [token])

  if (loading) return <div className="flex h-40 items-center justify-center">Loading specifications...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-2">Project Specifications</h2>
          <p className="text-sm font-medium text-slate-500">Review generated project books and technical requirements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specs.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No specifications generated yet. Negotiate a new idea with the Assistant!</p>
          </div>
        ) : (
          specs.map(spec => (
            <Card key={spec.id} className="hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-full">
              <CardHeader className="p-6 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                    <BookOpen size={24} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    {spec.methodology}
                  </span>
                </div>
                <CardTitle className="text-xl font-black group-hover:text-[#00BCD4] transition-colors mb-2">
                  {spec.project_title}
                </CardTitle>
                <CardDescription className="text-sm font-medium leading-relaxed line-clamp-2">
                  {spec.project_summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between p-6 pt-0">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400 mb-6">
                  <Calendar size={16} />
                  {new Date(spec.created_at).toLocaleDateString()}
                </div>

                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" className="w-full h-11 gap-2.5 text-sm font-black uppercase tracking-widest border-2 hover:bg-slate-50 transition-all">
                      Preview Document <ChevronRight size={18} />
                    </Button>
                  } />
                  <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">{spec.project_title}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-6 prose prose-slate max-w-none">
                      <div className="markdown-preview">
                        <ReactMarkdown>
                          {spec.markdown_content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
