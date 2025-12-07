import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ArrowLeft, TrendingUp, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: transactions } = await supabase.from('transactions').select('*, products(name, cost_price), profiles(name, email)').eq('type', 'sold').order('created_at', { ascending: false })

  let totalRevenue = 0, totalProfit = 0
  const statsByMonth: any = {}, statsByUser: any = {}

  transactions?.forEach((t: any) => {
    const date = new Date(t.created_at)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const userName = t.profiles?.name || t.profiles?.email || 'Unknown'
    const profit = (t.actual_price || 0) - (t.products?.cost_price || 0)

    totalRevenue += t.actual_price || 0
    totalProfit += profit

    if (!statsByMonth[month]) statsByMonth[month] = { revenue: 0, profit: 0, count: 0 }
    statsByMonth[month].revenue += t.actual_price || 0; statsByMonth[month].profit += profit; statsByMonth[month].count++

    if (!statsByUser[userName]) statsByUser[userName] = { name: userName, revenue: 0, profit: 0, count: 0 }
    statsByUser[userName].revenue += t.actual_price || 0; statsByUser[userName].profit += profit; statsByUser[userName].count++
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar email={user.email!} role="ADMIN" />
      <main className="container mx-auto p-4 space-y-8">
        <div className="flex items-center gap-4"><Link href="/dashboard"><ArrowLeft className="w-5 h-5"/></Link><h1 className="text-2xl font-bold">Estadísticas</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border"><h3 className="text-sm font-medium text-slate-500">Beneficio Neto</h3><p className="text-3xl font-bold text-green-600">{totalProfit.toFixed(2)} €</p></div>
          <div className="bg-white p-6 rounded-xl border"><h3 className="text-sm font-medium text-slate-500">Ventas</h3><p className="text-3xl font-bold">{transactions?.length}</p></div>
          <div className="bg-white p-6 rounded-xl border"><h3 className="text-sm font-medium text-slate-500">Margen</h3><p className="text-3xl font-bold text-blue-600">{totalRevenue ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0}%</p></div>
        </div>
        
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-slate-50 font-bold">Ranking Vendedores</div>
          <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Usuario</th><th className="p-4 text-right">Beneficio</th></tr></thead>
          <tbody>{Object.values(statsByUser).sort((a:any,b:any)=>b.profit-a.profit).map((u:any)=><tr key={u.name}><td className="p-4">{u.name}</td><td className="p-4 text-right font-bold text-green-600">{u.profit.toFixed(2)}€</td></tr>)}</tbody></table>
        </div>
      </main>
    </div>
  )
}