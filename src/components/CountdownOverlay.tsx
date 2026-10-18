import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  durationSec?: number; // 기본 3초
  isPaused?: boolean;
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  durationSec = 3,
  isPaused = false,
  onComplete,
}) => {
  const [count, setCount] = useState<number>(durationSec);

  useEffect(() => {
    if (isPaused) return;

    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, isPaused, onComplete]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-cyber-black/70 backdrop-blur-sm select-none">
      <div className="text-center animate-pulse">
        <span className="text-xs font-mono tracking-widest text-neon-cyan uppercase">
          Ready to Beat
        </span>
        <div className="font-orbitron font-black text-7xl md:text-8xl text-white drop-shadow-[0_0_30px_#00f0ff] mt-2">
          {count > 0 ? count : 'GO!'}
        </div>
        <p className="text-xs text-gray-400 font-mono mt-4">
          Tap D, F, J, K or Bottom Pads
        </p>
      </div>
    </div>
  );
};
