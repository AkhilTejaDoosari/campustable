// Preloads the extensionless-TS resolve hook for the test run.
// Loaded via: node --test --import ./tests/register.mjs tests/
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
