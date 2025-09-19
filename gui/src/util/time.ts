export function formatTimeAgo(dateString: string): string {
  const date = new Date(parseInt(dateString));
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return '방금 전';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * 숫자 타임스탬프를 받는 formatTimeAgo 오버로드
 */
export function formatTimeAgoFromTimestamp(timestamp: number): string {
  const now = new Date();
  const diffInMs = now.getTime() - timestamp;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return '방금 전';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

export function formatDateTime(dateString: string): string {
  const date = new Date(parseInt(dateString));
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 숫자 타임스탬프를 받는 formatDateTime 오버로드
 */
export function formatDateTimeFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 실시간 시간 업데이트를 위한 관리자 클래스
 */
export class TimeUpdateManager {
  private static instance: TimeUpdateManager;
  private updateCallbacks = new Set<() => void>();
  private updateTimer: NodeJS.Timeout | null = null;
  private updateInterval = 60000; // 1분마다 업데이트

  static getInstance(): TimeUpdateManager {
    if (!TimeUpdateManager.instance) {
      TimeUpdateManager.instance = new TimeUpdateManager();
    }
    return TimeUpdateManager.instance;
  }

  /**
   * 업데이트 콜백 등록
   * @param callback - 업데이트 시 호출될 함수
   * @returns 등록 해제 함수
   */
  subscribe(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    this.startTimer();

    return () => {
      this.updateCallbacks.delete(callback);
      if (this.updateCallbacks.size === 0) {
        this.stopTimer();
      }
    };
  }

  /**
   * 모든 등록된 콜백 호출
   */
  private notifyCallbacks(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Time update callback error:', error);
      }
    });
  }

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.notifyCallbacks();
    }, this.updateInterval);
  }

  /**
   * 타이머 중지
   */
  private stopTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * 즉시 업데이트 트리거
   */
  forceUpdate(): void {
    this.notifyCallbacks();
  }

  /**
   * 업데이트 간격 변경
   * @param interval - 새로운 간격 (ms)
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = interval;
    if (this.updateTimer) {
      this.stopTimer();
      this.startTimer();
    }
  }
}

export const timeUpdateManager = TimeUpdateManager.getInstance();