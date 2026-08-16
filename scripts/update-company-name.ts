async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const res = await fetch(`${supabaseUrl}/rest/v1/company_settings?id=eq.default`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceRoleKey!,
      'Authorization': `Bearer ${serviceRoleKey!}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ name_ar: 'مؤسسة ماهر السفر للنقل' })
  })

  if (!res.ok) {
    console.error('Failed to update:', await res.text())
  } else {
    console.log('Company settings updated successfully.')
  }
}

run()

run()
