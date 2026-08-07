import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
let url = ''
let key = ''

for (const line of envFile.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim()
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim()
}

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) console.error(error)
  else {
    const drivers = data.users.filter(u => u.email.includes('driver'))
    console.log(drivers.map(u => ({ email: u.email, id: u.id })))
  }
}
run()
