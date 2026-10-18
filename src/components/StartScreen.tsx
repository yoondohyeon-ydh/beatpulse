import React, { useState } from 'react';
import { Play, Settings, Trophy, ChevronLeft, ChevronRight, Music2, Activity } from 'lucide-react';
import { TrackData, Difficulty } from '../types/track';
import { UserSettings, HighScoreRecord } from '../types/game';
import { TRACKS } from '../tracks';
import { loadHighScore } from '../utils/storage';

interface StartScreenProps {
  onStartGame: (track: TrackData, difficulty: Difficulty) => void;
  settings: UserSettings;
  onOpenSettings: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  settings,
  onOpenSettings,
}) => {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const currentTrack = TRACKS[selectedTrackIndex];
  const highScoreRecord: HighScoreRecord | null = loadHighScore(currentTrack.id, difficulty);

  const handlePrevTrack = () => {
    setSelectedTrackIndex((prev) => (prev > 0 ? prev - 1 : TRACKS.length - 1));
  };

  const handleNextTrack = () => {
    setSelectedTrackIndex((prev) => (prev < TRACKS.length - 1 ? prev + 1 : 0));
  };

  const difficultyList: Difficulty[] = ['easy', 'normal', 'hard'];
  const diffLabels: Record<Difficulty, { label: string; color: string; activeColor: string }> = {
    easy: {
      label: 'EASY',
      color: 'border-neon-cyan/40 text-neon-cyan/80 bg-neon-cyan/5',
      activeColor: 'border-neon-cyan text-cyber-black bg-neon-cyan shadow-[0_0_15px_#00f0ff]',
    },
    normal: {
      label: 'NORMAL',
      color: 'border-neon-yellow/40 text-neon-yellow/80 bg-neon-yellow/5',
      activeColor: 'border-neon-yellow text-cyber-black bg-neon-yellow shadow-[0_0_15px_#ffe600]',
    },
    hard: {
      label: 'HARD',
      color: 'border-neon-pink/40 text-neon-pink/80 bg-neon-pink/5',
      activeColor: 'border-neon-pink text-white bg-neon-pink shadow-[0_0_15px_#ff007f]',
    },
  };

  const notesCount = currentTrack.charts[difficulty].length;

  return (
    <div className="w-full h-full max-w-md mx-auto flex flex-col justify-between p-4 bg-cyber-darker text-white select-none overflow-y-auto">
      {/* 상단 타이틀 & 설정 버튼 */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Activity className="text-neon-cyan animate-pulse" size={24} />
          <h1 className="font-orbitron font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink">
            BEAT PULSE
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-cyber-border bg-cyber-surface hover:border-neon-cyan hover:text-neon-cyan active:scale-95 transition-all"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* 중앙 트랙 셀렉터 */}
      <div className="flex flex-col gap-4 my-auto py-4">
        {/* 트랙 카드 캐러셀 */}
        <div className="relative rounded-2xl border border-cyber-border bg-cyber-surface/70 p-5 shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-neon-cyan tracking-widest">
            <span className="flex items-center gap-1">
              <Music2 size={13} /> TRACK {selectedTrackIndex + 1} / {TRACKS.length}
            </span>
            <span>BPM {currentTrack.bpm}</span>
          </div>

          {/* 좌우 이동 및 트랙명 */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevTrack}
              className="p-2 rounded-full border border-cyber-border bg-cyber-darker text-gray-300 hover:text-white hover:border-neon-cyan active:scale-90 transition-all"
              aria-label="Previous Track"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center flex-1 min-w-0">
              <h2 className="font-orbitron font-black text-xl md:text-2xl tracking-wide truncate text-white">
                {currentTrack.title}
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{currentTrack.artist}</p>
            </div>

            <button
              type="button"
              onClick={handleNextTrack}
              className="p-2 rounded-full border border-cyber-border bg-cyber-darker text-gray-300 hover:text-white hover:border-neon-cyan active:scale-90 transition-all"
              aria-label="Next Track"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 트랙 정보 요약 바 */}
          <div className="flex items-center justify-around py-2 rounded-xl bg-cyber-darker/60 border border-cyber-border text-xs font-mono">
            <div>
              <span className="text-gray-400">Length: </span>
              <strong className="text-white">{Math.round(currentTrack.duration)}s</strong>
            </div>
            <div>
              <span className="text-gray-400">Notes: </span>
              <strong className="text-neon-cyan">{notesCount}</strong>
            </div>
          </div>

          {/* 최고 점수 기록 표시 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-cyber-black/40 border border-cyber-border text-xs font-mono">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Trophy size={14} className="text-neon-yellow" />
              <span>RECORD</span>
            </div>
            {highScoreRecord ? (
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-neon-yellow text-sm">
                  {highScoreRecord.highScore.toLocaleString()}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-orbitron bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/40">
                  {highScoreRecord.grade}
                </span>
              </div>
            ) : (
              <span className="text-gray-500 italic">No record yet</span>
            )}
          </div>
        </div>

        {/* 난이도 선택 탭 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-400 font-mono tracking-wider">DIFFICULTY</span>
          <div className="grid grid-cols-3 gap-2">
            {difficultyList.map((d) => {
              const isSelected = difficulty === d;
              const meta = diffLabels[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-3 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider border transition-all active:scale-95 ${
                    isSelected ? meta.activeColor : meta.color
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 시작 버튼 및 가이드 */}
      <div className="flex flex-col gap-2 pb-2">
        <button
          type="button"
          onClick={() => onStartGame(currentTrack, difficulty)}
          className="w-full py-4 px-6 rounded-2xl font-orbitron font-black text-lg bg-gradient-to-r from-neon-cyan to-neon-blue text-cyber-black flex items-center justify-center gap-2 hover:brightness-110 active:scale-98 transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)]"
        >
          <Play size={22} fill="currentColor" />
          START GAME
        </button>

        <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono px-1">
          <span>Controls: D, F, J, K or Touch</span>
          <span>Offset: {settings.userOffsetMs > 0 ? `+${settings.userOffsetMs}` : settings.userOffsetMs}ms</span>
        </div>
      </div>
    </div>
  );
};
