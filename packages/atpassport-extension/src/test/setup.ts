import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock chrome API
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    session: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  },
  i18n: {
    getMessage: vi.fn((key) => key),
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

vi.stubGlobal('chrome', chromeMock);
vi.stubGlobal('browser', chromeMock);
vi.stubGlobal('defineUnlistedScript', (options: unknown) => options);
vi.stubGlobal('defineContentScript', (options: unknown) => options);

// Mock navigator.clipboard
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(),
    },
    configurable: true,
  });
} else {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn(),
    },
  });
}
