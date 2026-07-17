import { createInitialState, sanitizeState } from "./stopwatch-state";
import type { StopwatchState } from "./types";

export const STORAGE_KEY = "general-stopwatch:v1";

export function saveState(state: StopwatchState, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Nao foi possivel salvar o estado do cronometro.", error);
  }
}

export function loadState(storage: Storage = localStorage, now = Date.now()): StopwatchState {
  try {
    const rawState = storage.getItem(STORAGE_KEY);
    if (!rawState) {
      return createInitialState(now);
    }

    return sanitizeState(JSON.parse(rawState), now);
  } catch (error) {
    console.warn("Nao foi possivel restaurar o estado do cronometro.", error);
    return createInitialState(now);
  }
}

export function clearStoredState(storage: Storage = localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Nao foi possivel limpar o estado do cronometro.", error);
  }
}
