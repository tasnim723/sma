
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ScanFace, X, ArrowRight, ShieldCheck } from "lucide-react"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"

interface FaceIdOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onActivate: () => void
}

export default function FaceIdOnboardingModal({ isOpen, onClose, onActivate }: FaceIdOnboardingModalProps) {
  const { lang } = useLang()
  const { theme } = useThemeStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-[380px] rounded-[32px] overflow-hidden border ${
              theme === 'dark' 
                ? 'bg-[#0f172a] border-blue-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
            }`}
          >
            {/* Header / Icon */}
            <div className="relative h-32 flex items-center justify-center overflow-hidden">
              <div className={`absolute inset-0 opacity-10 ${theme === 'dark' ? 'bg-blue-500' : 'bg-[#00BCD4]'}`} />
              
              {/* Animated Circles */}
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute w-40 h-40 rounded-full border-2 ${theme === 'dark' ? 'border-blue-500' : 'border-[#00BCD4]'}`}
              />
              <motion.div 
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute w-56 h-56 rounded-full border border ${theme === 'dark' ? 'border-blue-400' : 'border-[#00BCD4]'}`}
              />

              <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${
                theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-[#00BCD4] text-white'
              }`}>
                <ScanFace size={32} strokeWidth={1.5} />
              </div>

              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 pb-8 pt-2 text-center">
              <h3 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {lang === 'fr' ? 'Activer Face ID' : 'Enable Face ID'}
              </h3>
              
              <p className={`text-[14px] leading-relaxed mb-8 ${theme === 'dark' ? 'text-blue-200/60' : 'text-slate-500'}`}>
                {lang === 'fr' 
                  ? 'Configurez Face ID pour vous connecter plus rapidement et en toute sécurité lors de vos prochaines visites.' 
                  : 'Configure Face ID to log in faster and more securely on your next visits.'}
              </p>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onActivate}
                  className={`w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'bg-[#00BCD4] text-white shadow-lg shadow-[#00BCD4]/20'
                  }`}
                >
                  <span>{lang === 'fr' ? 'Activer Face ID' : 'Activate Face ID'}</span>
                  <ArrowRight size={16} strokeWidth={3} />
                </motion.button>

                <button
                  onClick={onClose}
                  className={`py-2 text-[13px] font-bold transition-colors ${
                    theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lang === 'fr' ? 'Plus tard' : 'Later'}
                </button>
              </div>
            </div>

            {/* Bottom Badge */}
            <div className={`px-8 py-3 flex items-center justify-center gap-2 border-t ${
              theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-50 bg-slate-50/50'
            }`}>
              <ShieldCheck size={12} className={theme === 'dark' ? 'text-blue-400' : 'text-[#00BCD4]'} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Secure Biometrics
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
