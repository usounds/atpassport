import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock chrome API
const chromeMock = {
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

// Mock navigator.clipboard
vi.stubGlobal('navigator', {
  clipboard: {
    writeText: vi.fn(),
  },
});
