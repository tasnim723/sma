import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, Sparkles } from "lucide-react";

interface SuccessNotificationProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({ 
  isVisible, 
  message, 
  onClose 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
          className="fixed top-8 left-1/2 z-[200] w-full max-w-md px-4 pointer-events-none"
        >
          <div className="bg-white/80 backdrop-blur-2xl border border-[#00BCD4]/20 rounded-3xl shadow-[0_20px_50px_rgba(0,188,212,0.15)] p-5 flex items-center gap-5 pointer-events-auto ring-1 ring-black/5">
            <div className="w-12 h-12 rounded-2xl bg-[#00BCD4] flex items-center justify-center text-white shadow-lg shadow-[#00BCD4]/30 shrink-0">
              <CheckCircle size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00BCD4] flex items-center gap-1">
                  <Sparkles size={10} />
                  Succès
                </span>
              </div>
              <p className="text-sm font-bold text-slate-700 leading-snug line-clamp-2">
                {message}
              </p>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessNotification;
