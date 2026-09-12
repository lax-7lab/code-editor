import { Settings, DEFAULT_SETTINGS } from "../types";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const STORE_KEY = "settings";
const LOCALSTORAGE_KEY = "editrocket.settings";

function isTauri(): boolean {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = (source as Record<string, unknown>)[key as string];
    const targetValue = result[key as string];
    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key as string] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (sourceValue !== undefined) {
      result[key as string] = sourceValue;
    }
  }
  return result as T;
}

export class SettingsStore {
  private settings: Settings = DEFAULT_SETTINGS;
  private store: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): void; save(): Promise<void> } | null = null;
  private initialized = false;

  constructor() {}

  async load(): Promise<void> {
    if (this.initialized) return;

    try {
      if (isTauri()) {
        const { load } = await import("@tauri-apps/plugin-store");
        this.store = await load("settings.json", { autoSave: false });
        const stored = await this.store.get<Settings>(STORE_KEY);
        if (stored) {
          this.settings = deepMerge(DEFAULT_SETTINGS, stored);
        }
      } else {
        const raw = localStorage.getItem(LOCALSTORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          this.settings = deepMerge(DEFAULT_SETTINGS, parsed);
        }
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    } finally {
      this.initialized = true;
    }
  }

  get(): Settings {
    return this.settings;
  }

  async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    this.settings = { ...this.settings, [key]: value };
    await this.persist();
  }

  async setAll(partial: Partial<Settings>): Promise<void> {
    this.settings = deepMerge(this.settings, partial);
    await this.persist();
  }

  async reset(): Promise<void> {
    this.settings = DEFAULT_SETTINGS;
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      if (isTauri() && this.store) {
        this.store.set(STORE_KEY, this.settings);
        await this.store.save();
      } else {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch {
      // Silently fail - settings are kept in memory
    }
  }
}

export const settingsStore = new SettingsStore();