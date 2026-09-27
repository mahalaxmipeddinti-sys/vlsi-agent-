import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // Reduced to 2.5 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);

  const vias = [
    [20, 10], [50, 5], [80, 10],
    [20, 90], [50, 95], [80, 90],
    [10, 20], [5, 50], [10, 80],
    [90, 20], [95, 50], [90, 80]
  ];

  const traces = [
    "M 20 10 L 35 25 L 35 30",
    "M 50 5 L 50 30",
    "M 80 10 L 65 25 L 65 30",
    "M 20 90 L 35 75 L 35 70",
    "M 50 95 L 50 70",
    "M 80 90 L 65 75 L 65 70",
    "M 10 20 L 25 35 L 30 35",
    "M 5 50 L 30 50",
    "M 10 80 L 25 65 L 30 65",
    "M 90 20 L 75 35 L 70 35",
    "M 95 50 L 70 50",
    "M 90 80 L 75 65 L 70 65"
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030712] overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative w-64 h-64 flex items-center justify-center mb-8">
        {/* Glow behind the chip */}
        <motion.div
          className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
        />

        {/* Custom SVG Circuit Animation */}
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible relative z-10">
          {/* Vias */}
          {vias.map(([cx, cy], i) => (
            <motion.circle
              key={`via-${i}`}
              cx={cx} cy={cy} r="1.5"
              fill="#10b981"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
            />
          ))}

          {/* Traces */}
          {traces.map((d, i) => (
            <motion.path
              key={`trace-${i}`}
              d={d}
              stroke="#10b981"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 + i * 0.05, ease: "easeInOut" }}
            />
          ))}

          {/* Chip Outer Outline */}
          <motion.rect
            x="30" y="30" width="40" height="40" rx="3"
            stroke="#10b981"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeInOut" }}
          />

          {/* Chip Inner Die */}
          <motion.rect
            x="40" y="40" width="20" height="20" rx="1.5"
            stroke="#10b981"
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9, ease: "easeInOut" }}
          />

          {/* Power Up Glow Fill */}
          <motion.rect
            x="40" y="40" width="20" height="20" rx="1.5"
            fill="#10b981"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.5] }}
            transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
          />
          
          {/* Data pulses on traces */}
          {traces.map((d, i) => (
            <motion.path
              key={`pulse-${i}`}
              d={d}
              stroke="#ffffff"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 0.3, 0], 
                pathOffset: [0, 0.7, 1],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 1.2, 
                delay: 1.3 + (i % 3) * 0.15, 
                repeat: Infinity, 
                repeatDelay: 1 + (i % 2) * 0.5 
              }}
            />
          ))}
        </svg>
      </div>

      {/* Text Reveal */}
      <div className="flex flex-col items-center">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-bold text-white tracking-[0.3em] font-mono drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            VLSI<span className="text-emerald-500">_</span>STUDIO
          </motion.h1>
        </div>
        
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4, ease: "easeInOut" }}
          className="h-px w-64 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mt-4 mb-3"
        />

        <div className="overflow-hidden">
          <motion.p
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.6, ease: "easeOut" }}
            className="text-emerald-400/60 font-mono text-xs tracking-[0.2em]"
          >
            HARDWARE SYNTHESIS ENGINE
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
