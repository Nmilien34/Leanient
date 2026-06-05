type Store = Record<string, string>;

let store: Store = {};

export const testStorage = {
  async getItem(key: string): Promise<string | null> {
    return store[key] ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store[key] = value;
  },
  async removeItem(key: string): Promise<void> {
    delete store[key];
  },
  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      delete store[key];
    }
  },
  clear(): void {
    store = {};
  },
  snapshot(): Store {
    return { ...store };
  },
};
