/**
 * Conditionally start MSW browser worker for API mocking in dev mode.
 *
 * Enabled by either:
 * - Environment variable: VITE_MOCK_API=true (use `pnpm dev:mock`)
 * - URL parameter: ?mock (e.g. http://localhost:5173/?mock)
 */
export async function initMocks(): Promise<void> {
  const shouldMock =
    import.meta.env.VITE_MOCK_API === "true" ||
    new URLSearchParams(window.location.search).has("mock");

  if (!shouldMock) return;

  const { worker } = await import("./browser");
  await worker.start({ onUnhandledRequest: "bypass" });
  console.log("[MSW] API mocking enabled");
}
