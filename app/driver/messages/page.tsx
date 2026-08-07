import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MessageSquare, Calendar } from 'lucide-react'

export default async function DriverMessagesPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  // 2. Get the driver record corresponding to this user
  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!driver) {
    return (
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
        <div className="p-4 bg-red-50 text-red-600 rounded-md">Driver profile not found.</div>
      </div>
    )
  }

  // 3. Fetch their messages (messages directed to them, or broadcast messages where recipient_driver_id is null)
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`recipient_driver_id.eq.${driver.id},recipient_driver_id.is.null`)
    .order('sent_at', { ascending: false })

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
        <p className="text-text-secondary text-sm">Announcements and messages from the company.</p>
      </div>

      <div className="space-y-4">
        {!messages || messages.length === 0 ? (
          <Card className="bg-surface border-border">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="text-center py-8 text-text-secondary">
                <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>You have no messages yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="bg-surface border-border">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full mt-1">
                    <MessageSquare className="text-primary" size={16} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-text-primary">
                        {message.recipient_driver_id ? 'Direct Message' : 'Broadcast'}
                      </span>
                      <span className="text-xs text-text-secondary flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{new Date(message.sent_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {message.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}