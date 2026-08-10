import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { warpIn } from '../../lib/motionVariants';
import CosmosCard from './CosmosCard';

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-4xl' };

export default function CosmosModal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div variants={warpIn} initial="hidden" animate="visible" exit="exit" className={`relative w-full ${sizes[size]}`}>
            <CosmosCard variant="gold" className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-jarvis text-lg text-gold-gradient">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Cerrar" className="icon-btn">
                  <X size={18} />
                </button>
              </div>
              {children}
            </CosmosCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
