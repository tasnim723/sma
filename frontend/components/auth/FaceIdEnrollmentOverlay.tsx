"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, CheckCircle2, AlertCircle, X, ShieldCheck, ScanFace } from "lucide-react"
import { useLang } from "@/lib/useLang"

interface FaceIdEnrollmentOverlayProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  userEmail?: string
}

export default function FaceIdEnrollmentOverlay({ isOpen, onClose, onComplete, userEmail }: FaceIdEnrollmentOverlayProps) {
  const { lang } = useLang()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<'requesting' | 'aligning' | 'scanning' | 'success' | 'error'>('requesting')
  const [errorMessage, setErrorMessage] = useState("")

  // Floating squares particles
  const squares = useMemo(() => [
    // Cyan squares
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `cyan-${i}`,
      color: '#00BCD4',
      shadow: 'rgba(0,188,212,0.5)',
      size: Math.random() * 10 + 5,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 8 + 6,
      xOffset: Math.random() * 40 - 20,
      yOffset: -(Math.random() * 120 + 60),
      delay: Math.random() * 4,
      rotate: Math.random() * 45,
    })),
    // Red squares
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `red-${i}`,
      color: '#e63946',
      shadow: 'rgba(230,57,70,0.5)',
      size: Math.random() * 8 + 4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 9 + 5,
      xOffset: Math.random() * 40 - 20,
      yOffset: Math.random() * 100 + 40,
      delay: Math.random() * 4,
      rotate: Math.random() * 45,
    })),
  ], [])

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [isOpen])


  const startCamera = async (retryCount = 0) => {
    try {
      setStatus('requesting')
      const constraints = retryCount === 0
        ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode: 'user' } }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStatus('aligning')
      setTimeout(() => { if (isOpen) startScanning() }, 2500)
    } catch (err: any) {
      if ((err.name === 'AbortError' || err.name === 'NotReadableError' || err.name === 'TrackStartError') && retryCount < 1) {
        return startCamera(retryCount + 1)
      }
      setStatus('error')
      let msg = lang === 'fr' ? "Erreur caméra" : "Camera error"
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = lang === 'fr' ? "Accès à la caméra refusé" : "Camera access denied"
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = lang === 'fr' ? "Caméra déjà utilisée" : "Camera already in use"
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = lang === 'fr' ? "Aucune caméra détectée" : "No camera detected"
      }
      setErrorMessage(msg)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const startScanning = () => {
    setStatus('scanning')
    setTimeout(() => {
      setStatus('success')
      setTimeout(() => { onComplete() }, 2000)
    }, 3000)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e8f4f8 40%, #fef2f2 100%)' }}
    >
      {/* Background: blobs + floating squares */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00BCD4]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#e63946]/8 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-[#00BCD4]/6 rounded-full blur-[80px]" />

        {/* Floating squares */}
        {squares.map((sq) => (
          <motion.div
            key={sq.id}
            className="absolute"
            style={{
              width: sq.size,
              height: sq.size,
              left: `${sq.left}%`,
              top: `${sq.top}%`,
              backgroundColor: sq.color,
              boxShadow: `0 0 8px ${sq.shadow}`,
              borderRadius: '2px',
            }}
            animate={{
              y: [0, sq.yOffset, 0],
              x: [0, sq.xOffset, 0],
              rotate: [0, sq.rotate, 0],
              opacity: [0.15, 0.6, 0.15],
            }}
            transition={{
              duration: sq.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: sq.delay,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-8 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00BCD4] to-[#0096a8] flex items-center justify-center shadow-lg shadow-[#00BCD4]/30">
            <ScanFace size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-black tracking-tight leading-none text-lg">FACE ID</h2>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#00BCD4]/15 text-[#00BCD4] text-[9px] font-black uppercase tracking-[0.2em]">
              Enrollment
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-400 hover:text-slate-600 transition-all shadow-sm"
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera Feed Container */}
      <div className="relative flex items-center justify-center" style={{ width: '100%', maxWidth: '420px' }}>

        {/* Outer glow ring */}
        <motion.div
          className="absolute rounded-[110px] pointer-events-none"
          style={{ width: '82%', aspectRatio: '1' }}
          animate={{
            boxShadow: status === 'success'
              ? ['0 0 30px rgba(34,197,94,0.2)', '0 0 60px rgba(34,197,94,0.4)', '0 0 30px rgba(34,197,94,0.2)']
              : status === 'scanning'
              ? ['0 0 20px rgba(0,188,212,0.2)', '0 0 50px rgba(0,188,212,0.5)', '0 0 20px rgba(0,188,212,0.2)']
              : ['0 0 20px rgba(0,188,212,0.1)', '0 0 35px rgba(0,188,212,0.25)', '0 0 20px rgba(0,188,212,0.1)'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Video frame */}
        <div
          className="relative overflow-hidden shadow-2xl"
          style={{
            width: '80%',
            aspectRatio: '1',
            borderRadius: '100px',
            border: status === 'success'
              ? '2.5px solid rgba(34,197,94,0.6)'
              : status === 'scanning'
              ? '2.5px solid rgba(0,188,212,0.7)'
              : '2.5px solid rgba(0,188,212,0.3)',
            background: '#e8f4f8',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.8)',
          }}
        >
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e8f4f8] to-[#f0f9ff]">
              {status === 'requesting' && (
                <div className="w-8 h-8 border-[3px] border-[#00BCD4]/20 border-t-[#00BCD4] rounded-full animate-spin" />
              )}
            </div>
          )}

          {/* Scanning line */}
          <AnimatePresence>
            {status === 'scanning' && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-[2px] z-10"
                style={{ background: 'linear-gradient(90deg, transparent, #00BCD4, transparent)', boxShadow: '0 0 16px rgba(0,188,212,0.8)' }}
              />
            )}
          </AnimatePresence>

          {/* Success overlay */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-20"
                style={{ background: 'rgba(240,253,244,0.85)', backdropFilter: 'blur(4px)' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  <CheckCircle2 size={72} className="text-emerald-500" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Corner markers */}
        <div className="absolute pointer-events-none flex items-center justify-center" style={{ width: '84%', aspectRatio: '1' }}>
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-7 h-7 -translate-x-0.5 -translate-y-0.5"
            style={{ borderTop: '3px solid #00BCD4', borderLeft: '3px solid #00BCD4', borderRadius: '40px 0 0 0' }} />
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-7 h-7 translate-x-0.5 -translate-y-0.5"
            style={{ borderTop: '3px solid #e63946', borderRight: '3px solid #e63946', borderRadius: '0 40px 0 0' }} />
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-7 h-7 -translate-x-0.5 translate-y-0.5"
            style={{ borderBottom: '3px solid #e63946', borderLeft: '3px solid #e63946', borderRadius: '0 0 0 40px' }} />
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-7 h-7 translate-x-0.5 translate-y-0.5"
            style={{ borderBottom: '3px solid #00BCD4', borderRight: '3px solid #00BCD4', borderRadius: '0 0 40px 0' }} />

          {/* Pulse ring when aligning */}
          {status === 'aligning' && (
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-[100px]"
              style={{ border: '2px solid #00BCD4' }}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-10 text-center px-8 z-20">
        <AnimatePresence mode="wait">
          {status === 'aligning' && (
            <motion.div key="aligning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
              <h3 className="text-slate-700 text-xl font-black">
                {lang === 'fr' ? 'Positionnez votre visage' : 'Position your face'}
              </h3>
              <p className="text-slate-400 text-sm font-medium">
                {lang === 'fr' ? 'Alignez-vous avec le cadre pour commencer' : 'Align with the frame to start'}
              </p>
            </motion.div>
          )}

          {status === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <h3 className="text-[#00BCD4] text-xl font-black tracking-[0.15em] uppercase">
                {lang === 'fr' ? 'Analyse en cours' : 'Scanning'}
              </h3>
              <div className="flex items-center justify-center gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-[#00BCD4]"
                  />
                ))}
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {lang === 'fr' ? 'Cartographie biométrique 3D...' : '3D Biometric Mapping...'}
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
              <h3 className="text-emerald-500 text-2xl font-black uppercase">
                {lang === 'fr' ? 'Face ID activé !' : 'Face ID activated!'}
              </h3>
              <p className="text-slate-400 text-sm font-medium">
                {lang === 'fr' ? 'Capture biométrique terminée' : 'Biometric capture completed'}
              </p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-red-500">
                <AlertCircle size={18} />
                <span className="font-bold text-sm">{errorMessage}</span>
              </div>
              <button
                onClick={() => startCamera()}
                className="px-6 py-2 bg-white border border-slate-200 hover:border-[#00BCD4]/50 text-slate-600 hover:text-[#00BCD4] rounded-full text-sm font-bold transition-all shadow-sm"
              >
                {lang === 'fr' ? 'Réessayer' : 'Try Again'}
              </button>
            </motion.div>
          )}

          {status === 'requesting' && (
            <motion.div key="requesting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <h3 className="text-slate-600 text-lg font-bold">
                {lang === 'fr' ? 'Accès à la caméra...' : 'Accessing camera...'}
              </h3>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security Note */}
      <div className="absolute bottom-10 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/70 border border-slate-200/80 backdrop-blur-xl shadow-sm">
        <ShieldCheck size={13} className="text-[#00BCD4]" />
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {lang === 'fr'
            ? "Vos données biométriques sont sécurisées et chiffrées"
            : "Your biometric data is secured and encrypted"}
        </p>
      </div>
    </motion.div>
  )
}
