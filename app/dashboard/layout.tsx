import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', user.id)
      .single()
    
    if (profile?.must_change_password) {
      redirect('/change-password')
    }
  }

  return <>{children}</>
}
