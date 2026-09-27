import React from 'react';
import { X } from 'lucide-react';

interface BlockWorkingModalProps {
  element: any;
  onClose: () => void;
  frequencyMhz?: number;
}

export function BlockWorkingModal({ element, onClose }: BlockWorkingModalProps) {
  if (!element) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#141519] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
          {element.type} INSPECTOR
        </h3>
        <p className="text-sm text-gray-400 mb-4">Detailed view of the selected clock tree component.</p>
        <pre className="bg-black/50 p-4 rounded-xl text-xs text-cyan-300 font-mono overflow-auto max-h-64">
          {JSON.stringify(element.data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
