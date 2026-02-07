import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  createTheme,
  type CSSVariablesResolver,
} from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initMocks } from "./mocks/init";
import { checkVersionAndClearStorage } from "./utils/versionCheck";

checkVersionAndClearStorage();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * WCAG 2.1 AA accessible theme overrides.
 * - primaryShade 9 gives white-on-blue contrast ~6.4:1 (default shade 6 gives only 3.55:1)
 * - autoContrast ensures filled components auto-select light/dark text for best contrast
 * - dimmed color overridden to gray.7 via cssVariablesResolver for 7.01:1 contrast
 * - green shade 9 darkened (#278436) so white-on-green meets 4.5:1 (default #2b8a3e only gives 4.36:1)
 */
const theme = createTheme({
  primaryShade: { light: 9, dark: 6 },
  autoContrast: true,
  colors: {
    green: [
      "#ebfbee", "#d3f9d8", "#b2f2bb", "#8ce99a", "#69db7c",
      "#51cf66", "#40c057", "#37b24d", "#2f9e44", "#278436",
    ],
  },
});

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": "var(--mantine-color-gray-7)",
  },
  dark: {},
});

initMocks().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider
          theme={theme}
          cssVariablesResolver={cssVariablesResolver}
        >
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>
  );
});
