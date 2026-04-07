"use client"

import { useState } from "react"
import { UploadCloud, CheckCircle } from "lucide-react"

export default function DeliverableDropZone({ taskId, projectId }: { taskId: string, projectId: string }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  
  const handleDragLeave = () => setDragging(false)
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return;
    // Real app: await axios.post('/api/upload', formData)
    alert(`File ${file.name} uploaded successfully!`)
    setFile(null)
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}
        ${file ? 'border-green-500 bg-green-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {file ? (
        <>
          <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
          <p className="text-sm font-medium text-green-800">{file.name}</p>
          <button 
            onClick={handleUpload}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
          >
            Submit Deliverable
          </button>
        </>
      ) : (
        <>
          <UploadCloud className={`w-10 h-10 mb-2 ${dragging ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-sm text-slate-600 mb-1">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500">PDF, DOCX, XLSX, PNG, JPG (MAX. 10MB)</p>
        </>
      )}
    </div>
  )
}
