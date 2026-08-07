import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// TEMPORARY UTILITY — Remove after setup
export async function GET(request: NextRequest) {
  const admin = createAdminClient()

  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    users.map(u => ({
      id: u.id,
      email: u.email,
      confirmed: !!u.email_confirmed_at,
      created_at: u.created_at,
    }))
  )
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  const { email, password, role } = await request.json()

  // Check if user already exists
  const { data: { users } } = await admin.auth.admin.listUsers()
  const existing = users.find(u => u.email === email)

  if (existing) {
    // Update password for existing user
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Upsert profile
    await admin.from('profiles').upsert({
      id: existing.id,
      role: role || 'driver',
      full_name: email.split('@')[0],
    })

    return NextResponse.json({ success: true, updated: true, email, role })
  }

  // Create new user
  const { data: { user }, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !user) return NextResponse.json({ error: error?.message }, { status: 500 })

  await admin.from('profiles').upsert({ id: user.id, role: role || 'admin', full_name: email.split('@')[0] })

  return NextResponse.json({ success: true, created: true, email, role })
}
