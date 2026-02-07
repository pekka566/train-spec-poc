import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** MSW server for Vitest (Node.js environment). */
export const server = setupServer(...handlers);
