import { SessionData, TestResultData } from '../types';

const STORAGE_SESSION_KEY = 'unation_level_session_v1';
const STORAGE_RESULT_KEY = 'unation_level_result_v1';

export function saveLocalSession(data: SessionData): void {
  try {
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data)); // Redundant backup for mobile browser reload
  } catch (e) {
    console.error('Failed to save local session:', e);
  }
}

export function getLocalSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION_KEY) || localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearLocalSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch (e) {}
}

export function saveLocalResult(result: TestResultData): void {
  try {
    sessionStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(result));
    localStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(result));
  } catch (e) {}
}

export function getLocalResult(): TestResultData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_RESULT_KEY) || localStorage.getItem(STORAGE_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function getSecondsRemaining(expiresAtIso: string): number {
  const target = new Date(expiresAtIso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((target - now) / 1000);
  return Math.max(0, diffSec);
}
