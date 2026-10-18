import { LaneIndex } from '../types/track';

export type LaneHitCallback = (lane: LaneIndex) => void;
export type LaneReleaseCallback = (lane: LaneIndex) => void;

export class InputManager {
  private keyMap: Record<string, LaneIndex> = {
    KeyD: 0,
    KeyF: 1,
    KeyJ: 2,
    KeyK: 3,
    d: 0,
    f: 1,
    j: 2,
    k: 3,
    D: 0,
    F: 1,
    J: 2,
    K: 3,
  };

  private activeKeys = new Set<string>();
  private activeTouches = new Map<number, LaneIndex>(); // touchId -> lane

  private onHit: LaneHitCallback | null = null;
  private onRelease: LaneReleaseCallback | null = null;
  private isEnabled = false;

  // 이벤트 핸들러 바운드 함수 참조 (정확한 리스너 제거용)
  private handleKeyDownBound: (e: KeyboardEvent) => void;
  private handleKeyUpBound: (e: KeyboardEvent) => void;
  private handleBlurBound: () => void;

  constructor() {
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleKeyUpBound = this.handleKeyUp.bind(this);
    this.handleBlurBound = this.handleBlur.bind(this);
  }

  public init(onHit: LaneHitCallback, onRelease: LaneReleaseCallback): void {
    this.onHit = onHit;
    this.onRelease = onRelease;
    this.isEnabled = true;

    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('blur', this.handleBlurBound);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.activeKeys.clear();
      this.activeTouches.clear();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isEnabled || e.repeat) return;

    const lane = this.keyMap[e.code] ?? this.keyMap[e.key];
    if (lane !== undefined) {
      this.activeKeys.add(e.code);
      if (this.onHit) {
        this.onHit(lane);
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const lane = this.keyMap[e.code] ?? this.keyMap[e.key];
    if (lane !== undefined) {
      this.activeKeys.delete(e.code);
      if (this.onRelease) {
        this.onRelease(lane);
      }
    }
  }

  /**
   * 모바일 터치 패드 바인딩: 터치 엘리먼트 또는 캔버스 터치 영역
   */
  public handleTouchStart(lane: LaneIndex, touchId: number): void {
    if (!this.isEnabled) return;
    this.activeTouches.set(touchId, lane);
    if (this.onHit) {
      this.onHit(lane);
    }
  }

  public handleTouchEnd(touchId: number): void {
    const lane = this.activeTouches.get(touchId);
    if (lane !== undefined) {
      this.activeTouches.delete(touchId);
      if (this.onRelease) {
        this.onRelease(lane);
      }
    }
  }

  public handleTouchCancel(touchId: number): void {
    this.handleTouchEnd(touchId);
  }

  private handleBlur(): void {
    this.activeKeys.clear();
    this.activeTouches.clear();
  }

  public destroy(): void {
    this.isEnabled = false;
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('blur', this.handleBlurBound);
    this.activeKeys.clear();
    this.activeTouches.clear();
    this.onHit = null;
    this.onRelease = null;
  }
}
