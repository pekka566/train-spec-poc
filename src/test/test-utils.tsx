/* eslint-disable react-refresh/only-export-components -- test render helper and RTL re-exports */
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

function AllThemesProvider({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllThemesProvider>{children}</AllThemesProvider>
    ),
    ...options,
  });
}

export * from "@testing-library/react";
export { customRender as render };
