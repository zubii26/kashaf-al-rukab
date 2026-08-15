/**
 * Auth Load Test Script
 * 
 * Simulates the realistic usage pattern: multiple driver accounts
 * logging in and out concurrently, approximating shift-start burst.
 * 
 * Usage:
 *   npx tsx scripts/load-test-auth.ts
 * 
 * Environment variables (reads from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   LOAD_TEST_DRIVER_EMAIL_PREFIX  (default: "driver")
 *   LOAD_TEST_DRIVER_PASSWORD      (default: "testpassword123")
 *   LOAD_TEST_CONCURRENT_USERS     (default: 20)
 *   LOAD_TEST_CYCLES               (default: 3)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.warn('Warning: Could not read .env.local')
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const CONCURRENT_USERS = parseInt(process.env.LOAD_TEST_CONCURRENT_USERS || '20')
const CYCLES = parseInt(process.env.LOAD_TEST_CYCLES || '3')
const DRIVER_PASSWORD = process.env.LOAD_TEST_DRIVER_PASSWORD || 'testpassword123'
const EMAIL_PREFIX = process.env.LOAD_TEST_DRIVER_EMAIL_PREFIX || 'driver'

interface TimingResult {
  email: string
  cycle: number
  loginMs: number
  logoutMs: number
  success: boolean
  error?: string
}

async function runLoginLogoutCycle(email: string, password: string, cycle: number): Promise<TimingResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Login
  const loginStart = performance.now()
  const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
  const loginMs = Math.round((performance.now() - loginStart) * 100) / 100

  if (loginError) {
    return { email, cycle, loginMs, logoutMs: 0, success: false, error: loginError.message }
  }

  // Logout
  const logoutStart = performance.now()
  const { error: logoutError } = await supabase.auth.signOut()
  const logoutMs = Math.round((performance.now() - logoutStart) * 100) / 100

  return {
    email,
    cycle,
    loginMs,
    logoutMs,
    success: !logoutError,
    error: logoutError?.message,
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function main() {
  console.log('='.repeat(60))
  console.log('AUTH LOAD TEST')
  console.log('='.repeat(60))
  console.log(`Supabase URL:    ${SUPABASE_URL}`)
  console.log(`Concurrent:      ${CONCURRENT_USERS} users`)
  console.log(`Cycles:          ${CYCLES}`)
  console.log(`Email prefix:    ${EMAIL_PREFIX}`)
  console.log('='.repeat(60))
  console.log()

  const allResults: TimingResult[] = []

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    console.log(`--- Cycle ${cycle}/${CYCLES} ---`)
    const cycleStart = performance.now()

    // Fire all login/logout cycles concurrently
    const promises = Array.from({ length: CONCURRENT_USERS }, (_, i) => {
      const email = `${EMAIL_PREFIX}${i + 1}@test.com`
      return runLoginLogoutCycle(email, DRIVER_PASSWORD, cycle)
    })

    const results = await Promise.all(promises)
    const cycleMs = Math.round(performance.now() - cycleStart)
    allResults.push(...results)

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log(`  Completed in ${cycleMs}ms | ${successful.length} success, ${failed.length} failed`)

    if (failed.length > 0) {
      console.log(`  Failures:`)
      for (const f of failed.slice(0, 5)) {
        console.log(`    ${f.email}: ${f.error}`)
      }
    }
    console.log()
  }

  // Summary statistics
  const successful = allResults.filter(r => r.success)
  if (successful.length === 0) {
    console.log('ERROR: No successful login/logout cycles. Check credentials and Supabase URL.')
    console.log('Note: You need to create test driver accounts first.')
    console.log(`Expected format: ${EMAIL_PREFIX}1@test.com through ${EMAIL_PREFIX}${CONCURRENT_USERS}@test.com`)
    process.exit(1)
  }

  const loginTimes = successful.map(r => r.loginMs).sort((a, b) => a - b)
  const logoutTimes = successful.map(r => r.logoutMs).sort((a, b) => a - b)

  console.log('='.repeat(60))
  console.log('RESULTS SUMMARY')
  console.log('='.repeat(60))
  console.log()
  console.log(`Total attempts: ${allResults.length}`)
  console.log(`Successful:     ${successful.length}`)
  console.log(`Failed:         ${allResults.length - successful.length}`)
  console.log()

  console.log('LOGIN TIMING (ms)')
  console.log(`  Min:    ${loginTimes[0]}`)
  console.log(`  p50:    ${percentile(loginTimes, 50)}`)
  console.log(`  p95:    ${percentile(loginTimes, 95)}`)
  console.log(`  p99:    ${percentile(loginTimes, 99)}`)
  console.log(`  Max:    ${loginTimes[loginTimes.length - 1]}`)
  console.log(`  Avg:    ${Math.round(loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length)}`)
  console.log()

  console.log('LOGOUT TIMING (ms)')
  console.log(`  Min:    ${logoutTimes[0]}`)
  console.log(`  p50:    ${percentile(logoutTimes, 50)}`)
  console.log(`  p95:    ${percentile(logoutTimes, 95)}`)
  console.log(`  p99:    ${percentile(logoutTimes, 99)}`)
  console.log(`  Max:    ${logoutTimes[logoutTimes.length - 1]}`)
  console.log(`  Avg:    ${Math.round(logoutTimes.reduce((a, b) => a + b, 0) / logoutTimes.length)}`)
  console.log()
  console.log('='.repeat(60))
}

main().catch(console.error)
