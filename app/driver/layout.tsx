'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Map, MessageSquare, UserCircle, LogOut, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { name: 'Create Document', href: '/driver/trips/new', icon: FileText },
  { name: 'Trips History', href: '/driver/trips', icon: Map },
  { name: 'Messages', href: '/driver/messages', icon: MessageSquare },
  { name: 'Account', href: '/driver/account', icon: UserCircle },
]

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col text-text-primary">
      {/* Top Navigation Bar — hidden when printing */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="font-bold text-xl text-primary flex flex-col items-start leading-tight">
          <span className="text-base font-bold">مؤسسة ماهر السفر للنقل</span>
          <span className="text-xs font-medium text-text-secondary">Maher Al Safar Transport</span>
        </div>
        
        <nav className="hidden md:flex flex-1 items-center justify-center space-x-2 px-8">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href)
            const Icon = link.icon
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{link.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center space-x-4">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      
      {/* Mobile Nav — hidden when printing */}
      <div className="md:hidden flex overflow-x-auto p-2 bg-surface border-b border-border space-x-2 print:hidden">
         {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary bg-background border border-border'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
      </div>

      {/* Page Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto print:p-0">
        {children}
      </main>
    </div>
  )
}