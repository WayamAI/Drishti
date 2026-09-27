import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

/*
 * findBy* gives up after 1s by default. A page that mounts with its query
 * layer takes ~1s under a full parallel run, so "Controls: withholds New
 * control from an analyst" failed about one run in six at 1,065ms while
 * passing alone. 3s leaves room for a loaded machine without hiding a real
 * hang, which still fails.
 */
configure({ asyncUtilTimeout: 3000 });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Recharts measures its container; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

/**
 * jsdom 20 serves this suite from an opaque origin, where it exposes
 * sessionStorage but not localStorage. Anything reading window.localStorage
 * (use-theme, the sidebar collapse preference) therefore throws on render.
 * A minimal in-memory Storage keeps those components mountable.
 */
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, writable: true });
  Object.defineProperty(window, "localStorage", { value: memoryStorage, writable: true });
}
