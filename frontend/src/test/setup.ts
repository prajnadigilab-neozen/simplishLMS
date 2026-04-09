import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 🧪 Global setup for Vitest
// 1. Automatic cleanup after each test to prevent memory leaks or state pollution
afterEach(() => {
  cleanup();
});

// 2. Mocking browser-specific APIs if needed (e.g., matchMedia, localStorage)
// Object.defineProperty(window, 'matchMedia', {
//   writable: true,
//   value: vi.fn().mockImplementation(query => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addListener: vi.fn(), // Deprecated
//     removeListener: vi.fn(), // Deprecated
//     addEventListener: vi.fn(),
//     removeEventListener: vi.fn(),
//     dispatchEvent: vi.fn(),
//   })),
// });
