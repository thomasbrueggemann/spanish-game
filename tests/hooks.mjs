const STUB = new URL('./stub-net.mjs', import.meta.url).href
export async function resolve(spec, ctx, next) {
  if (spec.endsWith('net.js')) return {url: STUB, shortCircuit: true}
  return next(spec, ctx)
}
