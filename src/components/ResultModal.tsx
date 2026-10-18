import React from 'react';
import { RotateCcw, Home, Award, Trophy } from 'lucide-react';
import { TrackData, Difficulty } from '../types/track';
import { ScoreStats, ClearGrade } from '../types/game';

interface ResultModalProps {
  track: TrackData;
  difficulty: Difficulty;
  stats: ScoreStats;
  isNewRecord: boolean;
  onRestart: () => void;
  onHome: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  track,
  difficulty,
  stats,
  isNewRecord,
  onRestart,
  onHome,
}) => {
  const gradeColors: Record<ClearGrade, string> = {
    S: 'text-neon-yellow border-neon-yellow shadow-[0_0_30px_#ffe600]',
    A: 'text-neon-cyan border-neon-cyan shadow-[0_0_25px_#00f0ff]',
    B: 'text-neon-green border-neon-green shadow-[0_0_20px_#00ff88]',
    C: 'text-neon-blue border-neon-blue shadow-[0_0_15px_#0070f3]',
    F: 'text-neon-pink border-neon-pink shadow-[0_0_20px_#ff007f]',
  };

  const isClear = stats.grade !== 'F';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-cyber-black/90 backdrop-blur-md select-none animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-cyber-border bg-cyber-darker p-5 shadow-2xl flex flex-col gap-4 text-white">
        {/* 헤더 & 곡 정보 */}
        <div className="text-center border-b border-cyber-border pb-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-neon-cyan font-mono uppercase tracking-widest">
            <Award size={14} />
            {isClear ? 'Stage Cleared' : 'Stage Failed'}
          </div>
          <h2 className="font-orbitron font-bold text-xl text-white mt-1 truncate">
            {track.title}
          </h2>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border border-gray-600 bg-cyber-surface text-gray-300">
            {difficulty} • BPM {track.bpm}
          </span>
        </div>

        {/* 랭크 및 점수 메인 디스플레이 */}
        <div className="flex items-center justify-around py-2">
          {/* 랭크 원형 뱃지 */}
          <div
            className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center bg-cyber-surface/60 ${gradeColors[stats.grade]}`}
          >
            <span className="font-orbitron font-black text-4xl leading-none">
              {stats.grade}
            </span>
            <span className="text-[9px] font-mono tracking-tighter opacity-80">GRADE</span>
          </div>

          {/* 총점 및 정확도 */}
          <div className="flex flex-col items-start gap-1">
            {isNewRecord && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-neon-pink/20 text-neon-pink border border-neon-pink/50 animate-bounce">
                <Trophy size={11} /> NEW RECORD!
              </span>
            )}
            <div className="text-xs text-gray-400 font-mono">FINAL SCORE</div>
            <div className="font-orbitron font-black text-2xl text-neon-cyan tracking-wider">
              {stats.score.toLocaleString()}
            </div>
            <div className="text-xs font-mono text-gray-300">
              ACCURACY: <strong className="text-white">{stats.accuracy.toFixed(2)}%</strong>
            </div>
            <div className="text-xs font-mono text-gray-300">
              MAX COMBO: <strong className="text-neon-yellow">{stats.maxCombo}</strong>
            </div>
          </div>
        </div>

        {/* 세부 판정 통계 그리드 */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-cyber-surface/50 border border-cyber-border text-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-neon-yellow font-bold">PERFECT</span>
            <span className="font-orbitron font-bold text-sm text-white">
              {stats.counts.PERFECT}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-neon-green font-bold">GREAT</span>
            <span className="font-orbitron font-bold text-sm text-white">
              {stats.counts.GREAT}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-neon-blue font-bold">GOOD</span>
            <span className="font-orbitron font-bold text-sm text-white">
              {stats.counts.GOOD}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-neon-pink font-bold">MISS</span>
            <span className="font-orbitron font-bold text-sm text-white">
              {stats.counts.MISS}
            </span>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onRestart}
            className="py-3 px-3 rounded-xl font-orbitron font-bold text-xs bg-neon-cyan text-cyber-black flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-98 transition-all shadow-[0_0_12px_rgba(0,240,255,0.4)]"
          >
            <RotateCcw size={14} />
            Play Again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="py-3 px-3 rounded-xl font-mono text-xs border border-cyber-border bg-cyber-surface text-gray-200 flex items-center justify-center gap-1.5 hover:text-white hover:border-gray-400 active:scale-98 transition-all"
          >
            <Home size={14} />
            Track Select
          </button>
        </div>
      </div>
    </div>
  );
};
