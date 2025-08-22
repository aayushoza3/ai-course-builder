// frontend/src/lib/ssr-localstorage.ts
// In-memory localStorage shim for server-side rendering.
// Prevents "ReferenceError: localStorage is not defined" during prerender.

declare global {
    // a shared store across imports on the server
    // eslint-disable-next-line no-var
    var __ACB_LS__: Map<string, string> | undefined;
  }
  
  // Only define on the server.
  if (typeof window === 'undefined') {
    if (!globalThis.__ACB_LS__) globalThis.__ACB_LS__ = new Map<string, string>();
  
    // If a localStorage isn't already defined, define a minimal one.
    if (typeof (globalThis as any).localStorage === 'undefined') {
      const store = globalThis.__ACB_LS__!;
      (globalThis as any).localStorage = {
        getItem(key: string) {
          return store.has(key) ? store.get(key)! : null;
        },
        setItem(key: string, value: string) {
          store.set(key, String(value));
        },
        removeItem(key: string) {
          store.delete(key);
        },
        clear() {
          store.clear();
        },
        key(i: number) {
          return Array.from(store.keys())[i] ?? null;
        },
        get length() {
          return store.size;
        },
      };
    }
  }
  
  export {};
  