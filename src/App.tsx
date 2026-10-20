import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, ScoreStats, UserSettings } from './types/game';
import { TrackData, Difficulty, NoteEvent } from './types/track';
import { TRACKS, getClonedChart } from './tracks';
import { audioEngine } from './engine/AudioEngine';
import { GameLoop } from './engine/GameLoop';
import { loadUserSettings, saveUserSettings, saveHighScore } from './utils/storage';

import { StartScreen } from './components/StartScreen';
import { GameCanvas } from './components/GameCanvas';
import { CountdownOverlay } from './components/CountdownOverlay';
import { Header } from './components/Header';
import { PauseModal } from './components/PauseModal';
import { ResultModal } from './components/ResultModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [selectedTrack, setSelectedTrack] = useState<TrackData>(TRACKS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [activeNotes, setActiveNotes] = useState<NoteEvent[]>([]);

  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [stats, setStats] = useState<ScoreStats>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    counts: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 },
    accuracy: 100,
    grade: 'S',
  });

  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // GameLoop 제어용 Ref
  const gameLoopRef = useRef<GameLoop | null>(null);
  // 일시정지 직전 상태 기억용 Ref (카운트다운 중 일시정지 복원용)
  const previousStateRef = useRef<GameState>('READY');

  // 설정 변경 시 저장 및 오디오 엔진 볼륨 반영
  const handleUpdateSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
    audioEngine.setVolumes(1.0, newSettings.bgmVolume, newSettings.sfxVolume);
  }, []);

  // 게임 시작 트리거
  const handleStartGame = useCallback(
    async (track: TrackData, diff: Difficulty) => {
      setSelectedTrack(track);
      setDifficulty(diff);

      // Web Audio 활성화
      await audioEngine.initAudio();
      audioEngine.setVolumes(1.0, settings.bgmVolume, settings.sfxVolume);

      // 독립 복제된 차트 노트 로드
      const freshNotes = getClonedChart(track, diff);
      setActiveNotes(freshNotes);

      // 점수 통계 초기화
      setStats({
        score: 0,
        combo: 0,
        maxCombo: 0,
        counts: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 },
        accuracy: 100,
        grade: 'S',
      });
      setIsNewRecord(false);

      // 3.0초 카운트다운과 함께 오디오 예약 시작
      audioEngine.startTrack(track.audioEvents, 3.0);
      previousStateRef.current = 'COUNTDOWN';
      setGameState('COUNTDOWN');
    },
    [settings]
  );

  // 카운트다운 완료 시 실제 연주 시작
  const handleCountdownComplete = useCallback(() => {
    audioEngine.ensureRunning();
    previousStateRef.current = 'PLAYING';
    setGameState('PLAYING');
  }, []);

  // 일시정지 & 재개
  const handlePause = useCallback(() => {
    setGameState((prev) => {
      if (prev !== 'PAUSED') {
        previousStateRef.current = prev;
      }
      return 'PAUSED';
    });
  }, []);

  const handleResume = useCallback(() => {
    setGameState(previousStateRef.current === 'COUNTDOWN' ? 'COUNTDOWN' : 'PLAYING');
  }, []);

  // 곡 다시하기
  const handleRestart = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }
    audioEngine.stopAndCleanup();
    handleStartGame(selectedTrack, difficulty);
  }, [handleStartGame, selectedTrack, difficulty]);

  // 메인 메뉴(곡 선택) 복귀
  const handleHome = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }
    audioEngine.stopAndCleanup();
    setGameState('READY');
  }, []);

  // 곡 종료 시 결과 집계
  const handleSongEnd = useCallback(
    (finalStats: ScoreStats) => {
      audioEngine.stopAndCleanup();
      setStats(finalStats);
      const res = saveHighScore(
        selectedTrack.id,
        difficulty,
        finalStats.score,
        finalStats.maxCombo,
        finalStats.accuracy,
        finalStats.grade
      );
      setIsNewRecord(res.isNewRecord);
      setGameState('RESULT');
    },
    [selectedTrack.id, difficulty]
  );

  // 시스템 일시정지 (화면 꺼짐, 백그라운드 전환 등)
  const handleAutoPause = useCallback(() => {
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev));
  }, []);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      audioEngine.stopAndCleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-full max-w-md mx-auto flex flex-col bg-cyber-black text-white overflow-hidden shadow-2xl">
      {/* 1. 시작 화면 */}
      {gameState === 'READY' && (
        <StartScreen
          onStartGame={handleStartGame}
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 2. 게임 플레이 화면 (카운트다운, 플레이, 일시정지, 결과 공통 뷰포트) */}
      {(gameState === 'COUNTDOWN' ||
        gameState === 'PLAYING' ||
        gameState === 'PAUSED' ||
        gameState === 'RESULT') && (
        <div className="relative w-full h-full flex flex-col">
          {/* 상단 HUD */}
          <Header
            track={selectedTrack}
            difficulty={difficulty}
            stats={stats}
            onPause={handlePause}
          />

          {/* 캔버스 및 터치 패드 */}
          <div className="relative flex-1 w-full overflow-hidden">
            <GameCanvas
              track={selectedTrack}
              notes={activeNotes}
              settings={settings}
              onStatsUpdate={setStats}
              onSongEnd={handleSongEnd}
              onAutoPause={handleAutoPause}
              isPaused={gameState === 'PAUSED'}
              gameLoopRef={gameLoopRef}
            />

            {/* 3초 카운트다운 오버레이 (일시정지 중에도 잔여 카운트다운 보존) */}
            {(gameState === 'COUNTDOWN' || (gameState === 'PAUSED' && previousStateRef.current === 'COUNTDOWN')) && (
              <CountdownOverlay
                durationSec={3}
                isPaused={gameState === 'PAUSED'}
                onComplete={handleCountdownComplete}
              />
            )}

            {/* 일시정지 모달 */}
            {gameState === 'PAUSED' && (
              <PauseModal
                onResume={handleResume}
                onRestart={handleRestart}
                onQuit={handleHome}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {/* 결과 모달 */}
            {gameState === 'RESULT' && (
              <ResultModal
                track={selectedTrack}
                difficulty={difficulty}
                stats={stats}
                isNewRecord={isNewRecord}
                onRestart={handleRestart}
                onHome={handleHome}
              />
            )}
          </div>
        </div>
      )}

      {/* 설정 모달 (시작 화면에서 오픈 가능) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
