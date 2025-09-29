import * as os from 'os';
import * as path from 'path';

/**
 * Continue config 디렉토리를 동적으로 감지하는 유틸리티
 * VSIX 배포 시 사용자 환경에서 Continue config 위치를 찾습니다.
 */

/**
 * Continue config 디렉토리 경로를 반환합니다.
 * 1. CONTINUE_GLOBAL_DIR 환경변수 확인
 * 2. 기본값: ~/.continue/
 * 3. 백업: ~/.axcode/
 */
export function getContinueConfigDir(): string {
  try {
    // 브라우저 환경에서는 process.env가 undefined일 수 있음
    if (typeof process !== 'undefined' && process.env) {
      const envConfigDir = process.env.CONTINUE_GLOBAL_DIR;
      if (envConfigDir) {
        return path.resolve(envConfigDir);
      }
    }

    // 브라우저 환경에서는 os.homedir() 사용 불가
    if (typeof os.homedir === 'function') {
      const homeDir = os.homedir();
      return path.join(homeDir, '.continue');
    } else {
      // 브라우저 환경에서는 임시 경로 사용
      return '/tmp/.continue';
    }
  } catch (error) {
    console.warn('Continue config 디렉토리 감지 실패, 기본값 사용:', error);
    // 브라우저 환경에서는 fallback 경로 사용
    return '/tmp/.continue';
  }
}

/**
 * AXCODE 설정 파일이 저장될 경로를 반환합니다.
 * Continue config 디렉토리에 axcode-settings.json으로 저장
 */
export function getAxcodeSettingsPath(): string {
  const continueConfigDir = getContinueConfigDir();
  return path.join(continueConfigDir, 'axcode-settings.json');
}

/**
 * AXCODE 전용 백업 설정 디렉토리 경로를 반환합니다.
 * Continue config를 찾을 수 없을 때 사용
 */
export function getAxcodeBackupConfigDir(): string {
  if (typeof os.homedir === 'function') {
    const homeDir = os.homedir();
    return path.join(homeDir, '.axcode');
  } else {
    // 브라우저 환경에서는 임시 경로 사용
    return '/tmp/.axcode';
  }
}

/**
 * 백업 설정 파일 경로를 반환합니다.
 */
export function getAxcodeBackupSettingsPath(): string {
  const backupConfigDir = getAxcodeBackupConfigDir();
  return path.join(backupConfigDir, 'settings.json');
}

/**
 * Continue config 디렉토리가 존재하는지 확인합니다.
 */
export async function checkContinueConfigExists(): Promise<boolean> {
  try {
    const configDir = getContinueConfigDir();
    const fs = await import('fs');
    return fs.existsSync(configDir);
  } catch (error) {
    return false;
  }
}

/**
 * 설정 파일 저장에 사용할 최종 경로를 결정합니다.
 * Continue config 디렉토리가 있으면 거기에, 없으면 백업 위치에 저장
 */
export async function getSettingsPath(): Promise<string> {
  const continueConfigExists = await checkContinueConfigExists();

  if (continueConfigExists) {
    return getAxcodeSettingsPath();
  } else {
    return getAxcodeBackupSettingsPath();
  }
}

/**
 * 디렉토리가 존재하지 않으면 생성합니다.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    const fs = await import('fs');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 }); // owner만 읽기/쓰기
    }
  } catch (error) {
    console.error('디렉토리 생성 실패:', dirPath, error);
    throw error;
  }
}