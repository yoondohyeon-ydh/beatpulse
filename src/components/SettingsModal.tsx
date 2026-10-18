import React from 'react';
import { X, Sliders, Volume2, Gauge } from 'lucide-react';
import { UserSettings } from '../types/game';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

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
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-cyber-black/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-cyber-border bg-cyber-darker p-5 shadow-2xl flex flex-col gap-4 text-white">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-cyber-border pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-neon-cyan" />
            <h2 className="font-orbitron font-bold text-lg tracking-wider">SETTINGS</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-cyber-surface active:scale-90 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 설정 항목들 */}
        <div className="flex flex-col gap-4 text-xs">
          {/* 타이밍 오프셋 */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-cyber-surface/40 border border-cyber-border">
            <div className="flex justify-between items-center text-gray-200">
              <span className="font-mono flex items-center gap-1.5 font-bold">
                <Sliders size={13} className="text-neon-cyan" />
                Audio Timing Offset
              </span>
              <span className="font-orbitron font-bold text-neon-cyan text-sm">
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
              className="w-full accent-neon-cyan cursor-pointer my-1"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>-200ms (Early)</span>
              <span>0ms (Default)</span>
              <span>+200ms (Late)</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-1">
              * 블루투스 이어폰 등으로 소리가 늦게 들릴 때는 + 방향으로 조절하세요.
            </p>
          </div>

          {/* 노트 낙하 배속 */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-cyber-surface/40 border border-cyber-border">
            <div className="flex justify-between items-center text-gray-200">
              <span className="font-mono flex items-center gap-1.5 font-bold">
                <Gauge size={13} className="text-neon-pink" />
                Note Speed
              </span>
              <span className="font-orbitron font-bold text-neon-pink text-sm">
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
              className="w-full accent-neon-pink cursor-pointer my-1"
            />
          </div>

          {/* BGM 마스터 볼륨 */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-cyber-surface/40 border border-cyber-border">
            <div className="flex justify-between items-center text-gray-200">
              <span className="font-mono flex items-center gap-1.5 font-bold">
                <Volume2 size={13} className="text-neon-yellow" />
                Synthesizer BGM Volume
              </span>
              <span className="font-orbitron font-bold text-neon-yellow text-sm">
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
              className="w-full accent-neon-yellow cursor-pointer my-1"
            />
          </div>
        </div>

        {/* 확인 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl font-orbitron font-bold text-xs bg-cyber-surface border border-cyber-border hover:border-neon-cyan hover:text-neon-cyan active:scale-98 transition-all"
        >
          SAVE & CLOSE
        </button>
      </div>
    </div>
  );
};
