// Detect if running in AI Studio or locally
export const isRunningInAIStudio = (): boolean => {
  return typeof window !== 'undefined' && 'aistudio' in window;
};

// Storage interface
interface StorageService {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

// Browser localStorage implementation
class LocalStorageService implements StorageService {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
}

// File-based storage for local development
class FileStorageService implements StorageService {
  private baseUrl = 'http://localhost:3001/api/storage';

  async getItem(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${key}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get item: ${response.statusText}`);
      }
      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error getting item from file storage:', error);
      // Fallback to localStorage if backend is not available
      return localStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        throw new Error(`Failed to set item: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting item in file storage:', error);
      // Fallback to localStorage if backend is not available
      localStorage.setItem(key, value);
    }
  }
}

// Export the appropriate storage service based on environment
export const storage: StorageService = isRunningInAIStudio()
  ? new LocalStorageService()
  : new FileStorageService();
