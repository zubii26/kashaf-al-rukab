'use client'

import { useActionState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PrimaryButton } from '@/components/ui/button'
import { login } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-text-primary">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="Maher Transport Logo" className="mx-auto h-24 w-auto object-contain rounded-md" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {state?.error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {state.error}
                </div>
              )}
              <PrimaryButton type="submit" className="w-full mt-2" disabled={isPending}>
                {isPending ? 'Signing in...' : 'Sign In'}
              </PrimaryButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}