/**
 * Lightweight performance timing utility for auth flow instrumentation.
 * Logs durations in milliseconds to the server console.
 * Use in proxy, login actions, and page components to measure auth overhead.
 */

export function startTimer(): () => number {
  const start = performance.now()
  return () => {
    const elapsed = performance.now() - start
    return Math.round(elapsed * 100) / 100
  }
}

export function logPerf(label: string, ms: number) {
  console.log(`[PERF] ${label}: ${ms}ms`)
}

/**
 * Wraps an async operation with timing.
 * Returns [result, elapsedMs].
 */
export async function timedAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<[T, number]> {
  const end = startTimer()
  const result = await fn()
  const elapsed = end()
  logPerf(label, elapsed)
  return [result, elapsed]
}
