// Resolve hook for node:test runs against TypeScript sources.
//
// src/lib modules import each other with extensionless relative paths
// (bundler resolution, e.g. `from "./validation"`). Plain `node --test`
// cannot resolve those, so this hook retries failed relative resolutions
// with explicit `.ts` / `.tsx` suffixes. No new dependencies; registered via
// tests/register.mjs (`node --test --import ./tests/register.mjs tests/`).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    const isRelative =
      specifier.startsWith("./") || specifier.startsWith("../");
    if (!isRelative || context.parentURL === undefined) throw error;
    const code = error?.code;
    if (code !== "ERR_MODULE_NOT_FOUND") throw error;
    let lastError = error;
    for (const ext of [".ts", ".tsx"]) {
      try {
        return await next(specifier + ext, context);
      } catch (retryError) {
        lastError = retryError;
      }
    }
    throw lastError;
  }
}
