import { getSettingsPath, ensureDirectoryExists } from '../util/configPath';
import * as path from 'path';

/**
 * AXCODE 사용자 설정 데이터 타입 정의
 */
export interface AxcodeSettings {
  personalToken?: string;
  lastUpdated?: string;
}

/**
 * 기본 설정값
 */
const DEFAULT_SETTINGS: AxcodeSettings = {
  personalToken: '',
};

/**
 * 설정 파일 저장 서비스 클래스
 */
class SettingsService {
  private settingsCache: AxcodeSettings | null = null;

  /**
   * 설정을 파일에서 불러옵니다.
   */
  async loadSettings(): Promise<AxcodeSettings> {
    try {
      // 브라우저 환경인지 확인
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // 브라우저 환경에서는 localStorage 사용
        const storedSettings = localStorage.getItem('axcode-settings');

        if (!storedSettings) {
          console.log('localStorage에 설정이 없음, 기본값 사용');
          this.settingsCache = { ...DEFAULT_SETTINGS };
          return this.settingsCache;
        }

        // localStorage에서 설정 읽기
        const savedSettings = JSON.parse(storedSettings) as AxcodeSettings;

        // 기본값과 병합
        this.settingsCache = {
          ...DEFAULT_SETTINGS,
          ...savedSettings,
        };

        console.log('설정 localStorage 로드 완료:', this.settingsCache);
        return this.settingsCache;
      } else {
        // Node.js 환경에서는 파일 시스템 사용
        const settingsPath = await getSettingsPath();
        const fs = await import('fs');

        // 파일이 존재하지 않으면 기본값 반환
        if (!fs.existsSync(settingsPath)) {
          console.log('설정 파일이 존재하지 않음, 기본값 사용:', settingsPath);
          this.settingsCache = { ...DEFAULT_SETTINGS };
          return this.settingsCache;
        }

        // 파일에서 설정 읽기
        const fileContent = fs.readFileSync(settingsPath, 'utf-8');
        const savedSettings = JSON.parse(fileContent) as AxcodeSettings;

        // 기본값과 병합 (새로운 설정 항목 추가 대응)
        this.settingsCache = {
          ...DEFAULT_SETTINGS,
          ...savedSettings,
        };

        console.log('설정 파일 로드 완료:', settingsPath);
        return this.settingsCache;
      }
    } catch (error) {
      console.error('설정 파일 로드 실패:', error);
      this.settingsCache = { ...DEFAULT_SETTINGS };
      return this.settingsCache;
    }
  }

  /**
   * 설정을 파일에 저장합니다.
   */
  async saveSettings(settings: Partial<AxcodeSettings>): Promise<boolean> {
    try {
      // 브라우저 환경인지 확인
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // 브라우저 환경에서는 localStorage 사용
        const currentSettings = this.settingsCache || await this.loadSettings();
        const updatedSettings: AxcodeSettings = {
          ...currentSettings,
          ...settings,
          lastUpdated: new Date().toISOString(),
        };

        // localStorage에 저장
        const jsonContent = JSON.stringify(updatedSettings, null, 2);
        localStorage.setItem('axcode-settings', jsonContent);

        // 캐시 업데이트
        this.settingsCache = updatedSettings;

        console.log('설정 localStorage 저장 완료:', updatedSettings);
        return true;
      } else {
        // Node.js 환경에서는 파일 시스템 사용
        const settingsPath = await getSettingsPath();
        const settingsDir = path.dirname(settingsPath);

        // 디렉토리 존재 확인 및 생성
        await ensureDirectoryExists(settingsDir);

        // 현재 설정과 병합
        const currentSettings = this.settingsCache || await this.loadSettings();
        const updatedSettings: AxcodeSettings = {
          ...currentSettings,
          ...settings,
          lastUpdated: new Date().toISOString(),
        };

        // 파일에 저장
        const fs = await import('fs');
        const jsonContent = JSON.stringify(updatedSettings, null, 2);
        fs.writeFileSync(settingsPath, jsonContent, {
          encoding: 'utf-8',
          mode: 0o600, // owner만 읽기/쓰기
        });

        // 캐시 업데이트
        this.settingsCache = updatedSettings;

        console.log('설정 파일 저장 완료:', settingsPath);
        return true;
      }
    } catch (error) {
      console.error('설정 파일 저장 실패:', error);
      return false;
    }
  }

  /**
   * 특정 설정값만 업데이트합니다.
   */
  async updateSetting<K extends keyof AxcodeSettings>(
    key: K,
    value: AxcodeSettings[K]
  ): Promise<boolean> {
    const updateObj = { [key]: value } as Partial<AxcodeSettings>;
    return await this.saveSettings(updateObj);
  }

  /**
   * 개인 토큰을 저장합니다.
   */
  async savePersonalToken(token: string): Promise<boolean> {
    return await this.updateSetting('personalToken', token);
  }

  /**
   * 개인 토큰을 가져옵니다.
   */
  async getPersonalToken(): Promise<string> {
    const settings = await this.loadSettings();
    return settings.personalToken || '';
  }

  /**
   * 설정을 초기화합니다.
   */
  async resetSettings(): Promise<boolean> {
    try {
      this.settingsCache = null;
      return await this.saveSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('설정 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 설정 파일이 존재하는지 확인합니다.
   */
  async settingsExists(): Promise<boolean> {
    try {
      const settingsPath = await getSettingsPath();
      const fs = await import('fs');
      return fs.existsSync(settingsPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 현재 캐시된 설정을 반환합니다. 캐시가 없으면 파일에서 로드합니다.
   */
  async getCurrentSettings(): Promise<AxcodeSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }
    return await this.loadSettings();
  }
}

// 싱글톤 인스턴스 생성
export const settingsService = new SettingsService();

// 편의 함수들 export
export const loadSettings = () => settingsService.loadSettings();
export const saveSettings = (settings: Partial<AxcodeSettings>) =>
  settingsService.saveSettings(settings);
export const savePersonalToken = (token: string) =>
  settingsService.savePersonalToken(token);
export const getPersonalToken = () => settingsService.getPersonalToken();
export const resetSettings = () => settingsService.resetSettings();