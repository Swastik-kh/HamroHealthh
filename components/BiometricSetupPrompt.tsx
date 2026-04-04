
import React from 'react';
import { Fingerprint, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BiometricSetupPromptProps {
  onClose: () => void;
  onSetup: () => void;
}

export const BiometricSetupPrompt: React.FC<BiometricSetupPromptProps> = ({ onClose, onSetup }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="relative p-8 text-center space-y-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex justify-center">
            <div className="bg-indigo-50 p-6 rounded-full relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-30"></div>
              <Fingerprint size={64} className="text-indigo-600 relative" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800 font-nepali">बायोमेट्रिक लगइन सेटअप गर्नुहोस्</h2>
            <p className="text-slate-500 font-nepali">
              अर्को पटक लगइन गर्दा पासवर्ड टाइप गरिरहनु पर्दैन। आफ्नो फिंगरप्रिन्ट वा फेस अनलक प्रयोग गरी छिटो लगइन गर्नुहोस्।
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={onSetup}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              <Fingerprint size={24} />
              <span>अहिले सेटअप गर्नुहोस्</span>
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white text-slate-500 font-bold py-3 px-6 rounded-2xl hover:bg-slate-50 transition-all"
            >
              पछि गरौँला
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <CheckCircle2 size={14} className="text-green-500" />
            <span>यो प्रविधि मोबाइल बैंकिङ जस्तै सुरक्षित छ।</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
