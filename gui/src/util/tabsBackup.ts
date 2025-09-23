import { Tab } from "../redux/slices/tabsSlice";

const TABS_BACKUP_KEY = "continue_tabs_backup";
const BACKUP_INTERVAL = 30000; // 30초마다 백업

export interface TabsBackup {
  tabs: Tab[];
  timestamp: number;
  version: number;
}

class TabsBackupManager {
  private static instance: TabsBackupManager;
  private backupTimer: NodeJS.Timeout | null = null;
  private lastBackupTime = 0;

  static getInstance(): TabsBackupManager {
    if (!TabsBackupManager.instance) {
      TabsBackupManager.instance = new TabsBackupManager();
    }
    return TabsBackupManager.instance;
  }

  // localStorage에 탭 상태 백업
  saveTabsToLocalStorage(tabs: Tab[]): void {
    try {
      const backup: TabsBackup = {
        tabs,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(TABS_BACKUP_KEY, JSON.stringify(backup));
      this.lastBackupTime = Date.now();
    } catch (error) {
      console.warn("탭 상태 백업 실패:", error);
    }
  }

  // localStorage에서 탭 상태 복구
  loadTabsFromLocalStorage(): Tab[] | null {
    try {
      const backupData = localStorage.getItem(TABS_BACKUP_KEY);
      if (!backupData) return null;

      const backup: TabsBackup = JSON.parse(backupData);

      // 백업이 너무 오래되었는지 확인 (24시간)
      const isExpired = Date.now() - backup.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        this.clearBackup();
        return null;
      }

      // 백업 데이터 검증
      if (backup.tabs && Array.isArray(backup.tabs)) {
        return backup.tabs.map(tab => ({
          id: tab.id || Date.now().toString(36),
          title: tab.title || "새 채팅",
          isActive: Boolean(tab.isActive),
          sessionId: tab.sessionId,
          timestamp: tab.timestamp || Date.now(),
        }));
      }

      return null;
    } catch (error) {
      console.warn("탭 상태 복구 실패:", error);
      this.clearBackup();
      return null;
    }
  }

  // 백업 데이터 삭제
  clearBackup(): void {
    try {
      localStorage.removeItem(TABS_BACKUP_KEY);
    } catch (error) {
      console.warn("백업 데이터 삭제 실패:", error);
    }
  }

  // 자동 백업 시작
  startAutoBackup(getTabsCallback: () => Tab[]): void {
    this.stopAutoBackup();

    this.backupTimer = setInterval(() => {
      const tabs = getTabsCallback();
      if (tabs && tabs.length > 0) {
        this.saveTabsToLocalStorage(tabs);
      }
    }, BACKUP_INTERVAL);
  }

  // 자동 백업 중지
  stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // 백업이 필요한지 확인 (변경사항이 있고 마지막 백업에서 충분한 시간이 지났을 때)
  shouldBackup(): boolean {
    return Date.now() - this.lastBackupTime > 5000; // 5초 이상 지났을 때
  }

  // 즉시 백업 (중요한 작업 후)
  immediateBackup(tabs: Tab[]): void {
    if (tabs && tabs.length > 0) {
      this.saveTabsToLocalStorage(tabs);
    }
  }
}

export const tabsBackupManager = TabsBackupManager.getInstance();