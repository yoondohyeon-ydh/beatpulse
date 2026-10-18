import React from 'react';
import { Play, RotateCcw, Home, Volume2, Sliders } from 'lucide-react';
import { UserSettings } from '../types/game';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuit,
  settings,
  onUpdateSettings,
}) => {
  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onUpdateSettings({ ...settings, userOffsetMs: val });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({ ...settings, noteSpeed: val });
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({ ...settings, bgmVolume: val });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-cyber-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-sm rounded-2xl border border-cyber-border bg-cyber-darker p-5 shadow-2xl flex flex-col gap-4">
        {/* 헤더 */}
        <div className="text-center border-b border-cyber-border pb-3">
          <h2 className="font-orbitron font-bold text-xl text-white tracking-widest uppercase">
            Game Paused
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">Audio & Loop Suspended</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl font-orbitron font-bold text-sm bg-neon-cyan text-cyber-black flex items-center justify-center gap-2 hover:brightness-110 active:scale-98 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            <Play size={16} fill="currentColor" />
            Resume
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl font-mono text-sm border border-cyber-border bg-cyber-surface text-gray-200 flex items-center justify-center gap-2 hover:text-white hover:border-gray-400 active:scale-98 transition-all"
          >
            <RotateCcw size={15} />
            Restart
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="w-full py-2.5 px-4 rounded-xl font-mono text-sm border border-red-900/60 bg-red-950/20 text-red-300 flex items-center justify-center gap-2 hover:bg-red-900/40 active:scale-98 transition-all"
          >
            <Home size={15} />
            Quit to Track Select
          </button>
        </div>

        {/* 실시간 설정 조정 (오프셋 & 배속) */}
        <div className="pt-3 border-t border-cyber-border flex flex-col gap-3 text-xs">
          {/* 타이밍 오프셋 */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1 font-mono">
                <Sliders size={13} className="text-neon-cyan" />
                Timing Offset
              </span>
              <span className="font-orbitron font-bold text-neon-cyan">
                {settings.userOffsetMs > 0 ? `+${settings.userOffsetMs}` : settings.userOffsetMs} ms
              </span>
            </div>
            <input
              type="range"
              min={-200}
              max={200}
              step={5}
              value={settings.userOffsetMs}
              onChange={handleOffsetChange}
              className="w-full accent-neon-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>-200ms (Early)</span>
              <span>0ms</span>
              <span>+200ms (Late)</span>
            </div>
          </div>

          {/* 노트 배속 */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-gray-300">
              <span className="font-mono">Note Speed</span>
              <span className="font-orbitron font-bold text-neon-pink">
                {settings.noteSpeed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={2.5}
              step={0.1}
              value={settings.noteSpeed}
              onChange={handleSpeedChange}
              className="w-full accent-neon-pink cursor-pointer"
            />
          </div>

          {/* BGM 볼륨 */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1 font-mono">
                <Volume2 size={13} className="text-neon-yellow" />
                BGM Volume
              </span>
              <span className="font-orbitron font-bold text-neon-yellow">
                {Math.round(settings.bgmVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.bgmVolume}
              onChange={handleBgmChange}
              className="w-full accent-neon-yellow cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
