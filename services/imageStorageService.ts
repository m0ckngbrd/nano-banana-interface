interface ImageStorageService {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const DATABASE_NAME = 'banana_pro_vision';
const STORE_NAME = 'generated_images';

class LocalFallbackImageStorage implements ImageStorageService {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to read image from local storage:', error);
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

class IndexedDbImageStorage implements ImageStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open image database.'));
    });

    return this.dbPromise;
  }

  private async runRequest<T>(mode: IDBTransactionMode, key: string, value?: string): Promise<T> {
    const database = await this.getDatabase();

    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request =
        mode === 'readonly'
          ? store.get(key)
          : value === undefined
            ? store.delete(key)
            : store.put(value, key);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    });
  }

  async getItem(key: string): Promise<string | null> {
    const value = await this.runRequest<string | undefined>('readonly', key);
    return value ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.runRequest('readwrite', key, value);
  }

  async removeItem(key: string): Promise<void> {
    await this.runRequest('readwrite', key);
  }
}

const hasIndexedDb = (): boolean => typeof indexedDB !== 'undefined';

export const imageStorage: ImageStorageService = hasIndexedDb()
  ? new IndexedDbImageStorage()
  : new LocalFallbackImageStorage();
