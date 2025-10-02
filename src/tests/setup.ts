import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IndexedDB
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn().mockResolvedValue([])
};

global.indexedDB = indexedDB as any;

// Mock crypto for encryption
global.crypto = {
  ...global.crypto,
  subtle: {
    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    encrypt: vi.fn(),
    decrypt: vi.fn()
  } as any
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

global.localStorage = localStorageMock as any;

// Mock sessionStorage
global.sessionStorage = localStorageMock as any;

// Mock fetch
global.fetch = vi.fn();

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn()
    },
    storage: {
      getDirectory: vi.fn()
    }
  },
  writable: true
});

// Suppress console errors in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
};
