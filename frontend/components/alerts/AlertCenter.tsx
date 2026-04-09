"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

interface AlertData {
  _id: string;
  title: string;
  message: string;
  urgency: string;
  is_read: boolean;
}

export default function AlertCenter() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) {
      fetchAlerts()
    }
  }, [token])

  const fetchAlerts = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/alerts/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts(res.data)
    } catch (err) {
      console.error("Failed to fetch alerts:", err)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await axios.patch(`http://localhost:8000/api/alerts/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts(alerts.map(a => a._id === id ? { ...a, is_read: true } : a))
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    }
  }

  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2.5 text-slate-400 hover:text-[#00CCCC] transition-colors bg-slate-50 rounded-xl border border-slate-100 focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-wider">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-[#00CCCC] uppercase bg-[#00CCCC]/10 px-2 py-0.5 rounded-full">{unreadCount} Nouvelle(s)</span>
            )}
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">Aucune notification à afficher</div>
            ) : (
              alerts.map(alert => (
                <div 
                  key={alert._id} 
                  onClick={() => !alert.is_read && markAsRead(alert._id)}
                  className={`p-4 border-b border-slate-50 transition-colors cursor-pointer hover:bg-slate-50/50
                    ${!alert.is_read ? 'bg-[#00CCCC]/[0.02]' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {alert.urgency === 'RED_CRITICAL' ? (
                        <AlertTriangle size={15} className="text-[#FF0000]" />
                      ) : (
                        <div className={`w-2 h-2 mt-1 rounded-full ${!alert.is_read ? 'bg-[#00CCCC] animate-pulse shadow-[0_0_8px_rgba(0,204,204,0.5)]' : 'bg-slate-300'}`} />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-[13px] leading-tight mb-1 ${!alert.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>
                        {alert.title}
                      </h4>
                      <p className={`text-[11px] leading-snug line-clamp-2 ${!alert.is_read ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fetchAlerts()}>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Actualiser</span>
          </div>
        </div>
      )}
    </div>
  )
}
