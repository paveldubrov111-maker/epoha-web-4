import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  t?: (key: string) => string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'danger',
  t = (k: string) => k
}) => {
  if (!isOpen) return null;

  const finalConfirmText = confirmText || (type === 'danger' ? t('confirmDelete') : t('confirmApply'));
  const finalCancelText = cancelText || t('confirmCancel');

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-2xl border border-zinc-200 dark:border-white/5 text-center overflow-hidden"
        >
          <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
          }`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          
          <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-6">
            {message}
          </p>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                type === 'danger' 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
              }`}
            >
              {finalConfirmText}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              {finalCancelText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
