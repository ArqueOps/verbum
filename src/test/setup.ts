import "@testing-library/jest-dom/vitest";

// Required for React 19 compatibility with Testing Library
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
