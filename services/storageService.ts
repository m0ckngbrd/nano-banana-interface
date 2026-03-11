export const STORAGE_KEYS = {
  apiKey: 'banana_pro_api_key',
  history: 'banana_pro_history',
  templates: 'banana_pro_templates',
  settings: 'banana_pro_settings',
} as const;

interface StorageService {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' &&
  Boolean(chrome.storage?.local);

class LocalStorageService implements StorageService {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from local storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

class ChromeStorageService implements StorageService {
  async getItem(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (items) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        const value = items[key];
        resolve(typeof value === 'string' ? value : null);
      });
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve();
      });
    });
  }

  async removeItem(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve();
      });
    });
  }
}

export const storage: StorageService = hasChromeStorage()
  ? new ChromeStorageService()
  : new LocalStorageService();
