import "@testing-library/jest-dom/vitest";
import { server } from "@/mocks/server";
import { afterAll, afterEach, beforeAll } from "vitest";

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// MantineProvider uses window.matchMedia (not available in jsdom)
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
    dispatchEvent: () => false,
  }),
});
