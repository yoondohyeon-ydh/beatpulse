import { NoteEvent, LaneIndex, TrackData } from '../types/track';
import { JudgmentType, ScoreStats, UserSettings } from '../types/game';
import { audioEngine } from './AudioEngine';
import {
  processHitInput,
  processAutoMisses,
  calculateHitScore,
  calculateAccuracy,
  calculateGrade,
  clampOffset,
} from './JudgeEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingJudgement {
  text: JudgmentType;
  lane: LaneIndex;
  y: number;
  alpha: number;
  scale: number;
  timeRemaining: number; // 초
}

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private track: TrackData;
  private notes: NoteEvent[] = [];
  private settings: UserSettings;

  private rafId: number | null = null;
  private isRunning = false;
  private isPaused = false;

  // 게임 상태 점수
  private stats: ScoreStats = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    counts: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 },
    accuracy: 100,
    grade: 'S',
  };

  // 비주얼 이펙트 상태
  private particles: Particle[] = [];
  private floatingJudgments: FloatingJudgement[] = [];
  private laneFlash: [number, number, number, number] = [0, 0, 0, 0]; // 각 레인 누름/타격 플래시 (0.0 ~ 1.0)

  // 캔버스 논리 크기 (DPR 분리용)
  private logicalWidth = 400;
  private logicalHeight = 600;

  // 콜백
  private onStatsUpdate: ((stats: ScoreStats) => void) | null = null;
  private onSongEnd: ((finalStats: ScoreStats) => void) | null = null;
  private onAutoPause: (() => void) | null = null;

  // 탭 가시성 핸들러
  private handleVisibilityChangeBound: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    track: TrackData,
    notes: NoteEvent[],
    settings: UserSettings,
    callbacks: {
      onStatsUpdate?: (stats: ScoreStats) => void;
      onSongEnd?: (finalStats: ScoreStats) => void;
      onAutoPause?: () => void;
    }
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2D context from canvas');
    this.ctx = context;

    this.logicalWidth = canvas.clientWidth || 400;
    this.logicalHeight = canvas.clientHeight || 600;

    this.track = track;
    this.notes = notes;
    this.settings = settings;

    this.onStatsUpdate = callbacks.onStatsUpdate || null;
    this.onSongEnd = callbacks.onSongEnd || null;
    this.onAutoPause = callbacks.onAutoPause || null;

    this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChangeBound);

    audioEngine.setExternalPauseCallback(() => {
      this.pause();
      if (this.onAutoPause) this.onAutoPause();
    });
  }

  /**
   * 게임 상태(점수, 콤보, 진행 시간)를 파괴하지 않고 설정을 갱신합니다.
   */
  public updateSettings(newSettings: UserSettings): void {
    this.settings = { ...newSettings };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private handleVisibilityChange(): void {
    if (document.hidden && this.isRunning && !this.isPaused) {
      this.pause();
      if (this.onAutoPause) {
        this.onAutoPause();
      }
    }
  }

  public start(): void {
    this.stop();
    this.isRunning = true;
    this.isPaused = false;

    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;

      const deltaSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (!this.isPaused) {
        this.update(deltaSec);
        this.render();
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    audioEngine.pause();
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    audioEngine.resume();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    audioEngine.stopAndCleanup();
  }

  public destroy(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibilityChangeBound);
    this.particles = [];
    this.floatingJudgments = [];
  }

  /**
   * 사용자 타격 입력 처리
   */
  public handleLaneInput(lane: LaneIndex): void {
    if (!this.isRunning || this.isPaused) return;

    this.laneFlash[lane] = 1.0;
    const gameTime = audioEngine.getCurrentGameTime();
    const safeOffset = clampOffset(this.settings.userOffsetMs);

    const { hitNote, judgment } = processHitInput(this.notes, lane, gameTime, safeOffset);

    if (hitNote && judgment.type !== 'NONE') {
      this.applyJudgment(judgment.type, lane);
      audioEngine.playHitSound(judgment.type as 'PERFECT' | 'GREAT' | 'GOOD');
    }
  }

  public handleLaneRelease(lane: LaneIndex): void {
    this.laneFlash[lane] = 0.3;
  }

  private applyJudgment(type: JudgmentType, lane: LaneIndex): void {
    if (type === 'NONE') return;

    if (type === 'MISS') {
      this.stats.combo = 0;
      this.stats.counts.MISS++;
    } else {
      this.stats.combo++;
      if (this.stats.combo > this.stats.maxCombo) {
        this.stats.maxCombo = this.stats.combo;
      }
      this.stats.counts[type]++;
      const scoreInc = calculateHitScore(type, this.stats.combo);
      this.stats.score += scoreInc;

      // 판정선 위치에 히트 파티클 폭발
      this.spawnParticles(lane);
    }

    this.stats.accuracy = calculateAccuracy(this.stats.counts);
    this.stats.grade = calculateGrade(this.stats.accuracy);

    // 플로팅 텍스트
    this.spawnJudgmentText(type, lane);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  private update(deltaSec: number): void {
    const gameTime = audioEngine.getCurrentGameTime();
    const safeOffset = clampOffset(this.settings.userOffsetMs);

    // 1. 자동 MISS 처리 (유효 타격 시간 초과 노트)
    const missedNotes = processAutoMisses(this.notes, gameTime, safeOffset);
    for (const missed of missedNotes) {
      this.applyJudgment('MISS', missed.lane);
    }

    // 2. 레인 플래시 감쇠
    for (let i = 0; i < 4; i++) {
      if (this.laneFlash[i] > 0) {
        this.laneFlash[i] = Math.max(0, this.laneFlash[i] - deltaSec * 3.5);
      }
    }

    // 3. 파티클 업데이트
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaSec * 60;
      p.y += p.vy * deltaSec * 60;
      p.life += deltaSec;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // 4. 플로팅 판정 텍스트 업데이트
    for (let i = this.floatingJudgments.length - 1; i >= 0; i--) {
      const fj = this.floatingJudgments[i];
      fj.timeRemaining -= deltaSec;
      fj.y -= deltaSec * 30; // 위로 떠오름
      fj.alpha = Math.max(0, fj.timeRemaining / 0.5);
      if (fj.timeRemaining <= 0) {
        this.floatingJudgments.splice(i, 1);
      }
    }

    // 5. 곡 종료 조건 검사
    // 마지막 노트 시간 + 1.5초 쿨다운 후 결과 화면 전환
    const lastNote = this.notes[this.notes.length - 1];
    const songEndTime = lastNote ? lastNote.time + 1.5 : this.track.duration;
    const allJudged = this.notes.every((n) => n.isJudged);

    if ((allJudged || gameTime > songEndTime) && gameTime > 1.0) {
      this.stop();
      if (this.onSongEnd) {
        this.onSongEnd({ ...this.stats });
      }
    }
  }

  private render(): void {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // 배경 그라디언트
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0a14');
    bgGrad.addColorStop(0.7, '#101024');
    bgGrad.addColorStop(1, '#18122b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const laneWidth = width / 4;
    const judgeLineY = height - 120; // 하단 터치 패드 위 판정선

    // 1. 레인 구분선 및 레인 플래시 렌더링
    const laneColors = ['#00f0ff', '#ff007f', '#9d00ff', '#ffe600'];

    for (let i = 0; i < 4; i++) {
      const x = i * laneWidth;

      // 레인 배경 발광
      if (this.laneFlash[i] > 0) {
        ctx.fillStyle = laneColors[i];
        ctx.globalAlpha = this.laneFlash[i] * 0.18;
        ctx.fillRect(x, 0, laneWidth, judgeLineY);
        ctx.globalAlpha = 1.0;
      }

      // 레인 구분선 (네온 라인)
      ctx.strokeStyle = '#23233c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 2. 판정선 렌더링 (글로우 효과)
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, judgeLineY);
    ctx.lineTo(width, judgeLineY);
    ctx.stroke();

    // 판정 원형 타겟 (각 레인별)
    for (let i = 0; i < 4; i++) {
      const centerX = i * laneWidth + laneWidth / 2;
      ctx.strokeStyle = laneColors[i];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, judgeLineY, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0; // 초기화

    // 3. 하강하는 노트 렌더링 (판정 엔진과 동일한 보정 목표 시각 적용)
    const gameTime = audioEngine.getCurrentGameTime();
    const speed = 550 * this.settings.noteSpeed; // 초당 이동 픽셀
    const safeOffset = clampOffset(this.settings.userOffsetMs);

    for (const note of this.notes) {
      if (note.isJudged) continue;

      // 판정 엔진과 일치하는 보정 목표 시각 계산
      const correctedTargetTime = note.time + safeOffset / 1000;
      const noteY = judgeLineY - (correctedTargetTime - gameTime) * speed;

      // 화면에 보이지 않는 범위는 렌더링 생략
      if (noteY < -50 || noteY > height) continue;

      const laneX = note.lane * laneWidth;
      const noteWidth = laneWidth * 0.76;
      const noteHeight = 20;
      const drawX = laneX + (laneWidth - noteWidth) / 2;

      // 네온 노트 디자인 (둥근 모서리 + 중심부 하이라이트)
      ctx.shadowColor = laneColors[note.lane];
      ctx.shadowBlur = 10;
      ctx.fillStyle = laneColors[note.lane];

      ctx.beginPath();
      ctx.roundRect(drawX, noteY - noteHeight / 2, noteWidth, noteHeight, 6);
      ctx.fill();

      // 내부 하얀빛 코어
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.roundRect(drawX + 4, noteY - noteHeight / 2 + 3, noteWidth - 8, noteHeight - 6, 4);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }

    // 4. 파티클 렌더링
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 5. 플로팅 판정 텍스트 렌더링
    for (const fj of this.floatingJudgments) {
      ctx.save();
      const centerX = fj.lane * laneWidth + laneWidth / 2;
      ctx.font = 'bold 24px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = fj.alpha;

      let color = '#00f0ff';
      if (fj.text === 'PERFECT') color = '#ffe600';
      else if (fj.text === 'GREAT') color = '#00ff88';
      else if (fj.text === 'GOOD') color = '#0070f3';
      else if (fj.text === 'MISS') color = '#ff0055';

      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.fillText(fj.text, centerX, fj.y);
      ctx.restore();
    }

    // 6. 콤보 표시 (판정선 상단 중앙)
    if (this.stats.combo > 1) {
      ctx.save();
      ctx.font = '900 36px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.fillText(`${this.stats.combo}`, width / 2, judgeLineY - 90);

      ctx.font = '600 13px Rajdhani, sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('COMBO', width / 2, judgeLineY - 70);
      ctx.restore();
    }
  }

  private spawnParticles(lane: LaneIndex): void {
    const laneWidth = this.logicalWidth / 4;
    const centerX = lane * laneWidth + laneWidth / 2;
    const judgeLineY = this.logicalHeight - 120;
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#ffffff'];

    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x: centerX,
        y: judgeLineY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // 살짝 위로 솟구침
        size: Math.random() * 3.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 0.35 + 0.2,
      });
    }
  }

  private spawnJudgmentText(text: JudgmentType, lane: LaneIndex): void {
    const judgeLineY = this.logicalHeight - 120;
    this.floatingJudgments.push({
      text,
      lane,
      y: judgeLineY - 35,
      alpha: 1.0,
      scale: 1.2,
      timeRemaining: 0.45,
    });
  }

  /**
   * 캔버스 크기 변경 시 논리적 렌더링 영역 크기만 갱신합니다.
   * (캔버스 버퍼 해상도 변경 및 컨텍스트 스케일링은 컴포넌트 책임)
   */
  public resize(width: number, height: number): void {
    this.logicalWidth = width;
    this.logicalHeight = height;
  }
}
