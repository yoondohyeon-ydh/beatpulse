import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TrackData, NoteEvent, LaneIndex } from '../types/track';
import { ScoreStats, UserSettings } from '../types/game';
import { GameLoop } from '../engine/GameLoop';
import { InputManager } from '../engine/InputManager';

interface GameCanvasProps {
  track: TrackData;
  notes: NoteEvent[];
  settings: UserSettings;
  onStatsUpdate: (stats: ScoreStats) => void;
  onSongEnd: (finalStats: ScoreStats) => void;
  onAutoPause: () => void;
  isPaused: boolean;
  gameLoopRef: React.MutableRefObject<GameLoop | null>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  track,
  notes,
  settings,
  onStatsUpdate,
  onSongEnd,
  onAutoPause,
  isPaused,
  gameLoopRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputManagerRef = useRef<InputManager | null>(null);

  // 모바일 터치 피드백 상태
  const [activeLanes, setActiveLanes] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);

  // 터치 핸들러
  const handleTouchStartLane = useCallback(
    (lane: LaneIndex, e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        inputManagerRef.current?.handleTouchStart(lane, touch.identifier);
      }
      setActiveLanes((prev) => {
        const next = [...prev] as [boolean, boolean, boolean, boolean];
        next[lane] = true;
        return next;
      });
    },
    []
  );

  const handleTouchEndLane = useCallback(
    (lane: LaneIndex, e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        inputManagerRef.current?.handleTouchEnd(touch.identifier);
      }
      setActiveLanes((prev) => {
        const next = [...prev] as [boolean, boolean, boolean, boolean];
        next[lane] = false;
        return next;
      });
    },
    []
  );

  // 최신 콜백 및 설정 보관용 Ref (불필요한 GameLoop 재생성 방지)
  const callbacksRef = useRef({ onStatsUpdate, onSongEnd, onAutoPause });
  useEffect(() => {
    callbacksRef.current = { onStatsUpdate, onSongEnd, onAutoPause };
  }, [onStatsUpdate, onSongEnd, onAutoPause]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    // 설정 변경 시 GameLoop를 파괴하지 않고 상태를 보존하며 설정만 갱신
    gameLoopRef.current?.updateSettings(settings);
  }, [settings, gameLoopRef]);

  // GameLoop 생명주기 (트랙 또는 차트 변경 시에만 재생성)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. 캔버스 해상도 맞춤 (DPR 적용 및 논리 크기 분리)
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      if (gameLoopRef.current) {
        gameLoopRef.current.resize(rect.width, rect.height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // 2. InputManager 생성 및 초기화
    const inputManager = new InputManager();
    inputManagerRef.current = inputManager;

    inputManager.init(
      (lane) => {
        gameLoopRef.current?.handleLaneInput(lane);
        setActiveLanes((prev) => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[lane] = true;
          return next;
        });
      },
      (lane) => {
        gameLoopRef.current?.handleLaneRelease(lane);
        setActiveLanes((prev) => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[lane] = false;
          return next;
        });
      }
    );

    // 3. GameLoop 생성 및 시작
    const rect = container.getBoundingClientRect();
    const gameLoop = new GameLoop(canvas, track, notes, settingsRef.current, {
      onStatsUpdate: (stats) => callbacksRef.current.onStatsUpdate?.(stats),
      onSongEnd: (finalStats) => callbacksRef.current.onSongEnd?.(finalStats),
      onAutoPause: () => callbacksRef.current.onAutoPause?.(),
    });
    gameLoop.resize(rect.width, rect.height);
    gameLoopRef.current = gameLoop;

    if (!isPaused) {
      gameLoop.start();
    } else {
      gameLoop.pause();
    }

    // 4. 언마운트 시 안전한 클린업
    return () => {
      window.removeEventListener('resize', updateSize);
      inputManager.destroy();
      gameLoop.destroy();
      gameLoopRef.current = null;
    };
  }, [track, notes, gameLoopRef]);

  // 일시정지 상태 동기화
  useEffect(() => {
    if (!gameLoopRef.current) return;
    if (isPaused) {
      gameLoopRef.current.pause();
      inputManagerRef.current?.setEnabled(false);
    } else {
      gameLoopRef.current.resume();
      inputManagerRef.current?.setEnabled(true);
    }
  }, [isPaused, gameLoopRef]);

  const laneLabels = ['D', 'F', 'J', 'K'];
  const laneColors = [
    'border-neon-cyan text-neon-cyan shadow-neon-cyan/40 bg-neon-cyan/10',
    'border-neon-pink text-neon-pink shadow-neon-pink/40 bg-neon-pink/10',
    'border-neon-purple text-neon-purple shadow-neon-purple/40 bg-neon-purple/10',
    'border-neon-yellow text-neon-yellow shadow-neon-yellow/40 bg-neon-yellow/10',
  ];
  const laneActiveStyles = [
    'bg-neon-cyan/40 scale-95 shadow-[0_0_20px_#00f0ff]',
    'bg-neon-pink/40 scale-95 shadow-[0_0_20px_#ff007f]',
    'bg-neon-purple/40 scale-95 shadow-[0_0_20px_#9d00ff]',
    'bg-neon-yellow/40 scale-95 shadow-[0_0_20px_#ffe600]',
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full max-w-md mx-auto flex flex-col overflow-hidden bg-cyber-darker touch-none select-none"
    >
      {/* 게임 캔버스 */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />

      {/* 하단 모바일 터치 패드 */}
      <div className="absolute bottom-0 left-0 right-0 h-28 z-20 grid grid-cols-4 gap-1 p-2 bg-gradient-to-t from-cyber-black via-cyber-black/80 to-transparent">
        {laneLabels.map((keyLabel, idx) => {
          const laneIdx = idx as LaneIndex;
          const isActive = activeLanes[idx];
          return (
            <button
              key={keyLabel}
              type="button"
              onTouchStart={(e) => handleTouchStartLane(laneIdx, e)}
              onTouchEnd={(e) => handleTouchEndLane(laneIdx, e)}
              onTouchCancel={(e) => handleTouchEndLane(laneIdx, e)}
              onMouseDown={() => {
                inputManagerRef.current?.handleTouchStart(laneIdx, -1);
                setActiveLanes((prev) => {
                  const next = [...prev] as [boolean, boolean, boolean, boolean];
                  next[laneIdx] = true;
                  return next;
                });
              }}
              onMouseUp={() => {
                inputManagerRef.current?.handleTouchEnd(-1);
                setActiveLanes((prev) => {
                  const next = [...prev] as [boolean, boolean, boolean, boolean];
                  next[laneIdx] = false;
                  return next;
                });
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-75 select-none touch-none ${
                laneColors[idx]
              } ${isActive ? laneActiveStyles[idx] : 'opacity-85'}`}
            >
              <span className="font-orbitron font-bold text-lg md:text-xl">{keyLabel}</span>
              <span className="text-[10px] text-gray-400 font-mono tracking-tighter">PULSE</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
