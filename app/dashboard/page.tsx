import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AdminView from './admin-view'
import SellerView from './seller-view'
import ActivityFeed from './activity-feed'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return <div>Error: Perfil no encontrado.</div>

  const { data: products } = await supabase.from('products').select('*').order('name')
  const { data: allUsers } = await supabase.from('profiles').select('id, name, email').neq('id', user.id)
  
  // Get recent transactions for everyone to see activity
  const { data: transactions } = await supabase.from('transactions').select('*, products(name), profiles(name)').order('created_at', { ascending: false }).limit(20)

  if (profile.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar email={user.email!} role="ADMIN" />
        <main className="container mx-auto p-4 md:p-8"><AdminView products={products || []} transactions={transactions || []} /></main>
      </div>
    )
  } else {
    const { data: myHolds } = await supabase.from('inventory_holds').select('*, products(*)').eq('user_id', user.id)
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar email={user.email!} role="SELLER" />
        <main className="container mx-auto p-4 max-w-lg space-y-8">
            <SellerView products={products || []} myHolds={myHolds || []} profile={profile} allUsers={allUsers || []} />
            
            <div className="pt-8 border-t border-slate-200">
               <ActivityFeed />
            </div>
        </main>
      </div>
    )
  }
}
