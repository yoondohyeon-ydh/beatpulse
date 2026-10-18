import React from 'react';
import { Pause } from 'lucide-react';
import { TrackData, Difficulty } from '../types/track';
import { ScoreStats } from '../types/game';

interface HeaderProps {
  track: TrackData;
  difficulty: Difficulty;
  stats: ScoreStats;
  onPause: () => void;
}

export const Header: React.FC<HeaderProps> = ({ track, difficulty, stats, onPause }) => {
  const diffColors: Record<Difficulty, string> = {
    easy: 'text-neon-cyan border-neon-cyan/60 bg-neon-cyan/10',
    normal: 'text-neon-yellow border-neon-yellow/60 bg-neon-yellow/10',
    hard: 'text-neon-pink border-neon-pink/60 bg-neon-pink/10',
  };

  return (
    <header className="w-full max-w-md mx-auto flex items-center justify-between px-3 py-2 bg-cyber-darker/90 backdrop-blur-md border-b border-cyber-border z-30 select-none">
      {/* 트랙 정보 */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-orbitron font-bold text-sm tracking-wide text-white truncate max-w-[130px]">
            {track.title}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${diffColors[difficulty]}`}
          >
            {difficulty}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">BPM {track.bpm}</span>
      </div>

      {/* 스코어 & 콤보 HUD */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="font-orbitron font-bold text-base text-neon-cyan tracking-wider">
            {stats.score.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            ACC <strong className="text-white">{stats.accuracy.toFixed(1)}%</strong>
          </span>
        </div>

        {/* 일시정지 버튼 */}
        <button
          type="button"
          onClick={onPause}
          className="p-1.5 rounded-lg border border-cyber-border bg-cyber-surface text-gray-300 hover:text-white hover:border-neon-cyan active:scale-95 transition-all"
          aria-label="Pause"
        >
          <Pause size={18} />
        </button>
      </div>
    </header>
  );
};
