import { createClient } from '@/utils/supabase/server'
import { ArrowRightLeft, ShoppingCart, PackagePlus, RotateCcw, PackageMinus } from 'lucide-react'

export default async function ActivityFeed() {
  const supabase = await createClient()
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, products(name), profiles(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!transactions || transactions.length === 0) return <div className="text-center text-slate-400 text-sm py-4">Sin actividad reciente.</div>

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Actividad Reciente</h3>
      <div className="space-y-3">
        {transactions.map((t) => {
          let icon = <ArrowRightLeft className="w-4 h-4 text-slate-400" />
          let color = "bg-slate-100"
          let text = ""
          const userName = t.profiles?.name || "Alguien"
          const prodName = t.products?.name || "Producto"

          switch(t.type) {
            case 'sold':
              icon = <ShoppingCart className="w-4 h-4 text-green-600" />
              color = "bg-green-100"
              text = `${userName} vendió ${t.quantity}x ${prodName}`
              break
            case 'withdraw':
              icon = <PackageMinus className="w-4 h-4 text-amber-600" />
              color = "bg-amber-100"
              text = `${userName} retiró ${t.quantity}x ${prodName}`
              break
            case 'restock':
              icon = <PackagePlus className="w-4 h-4 text-blue-600" />
              color = "bg-blue-100"
              text = `Admin repuso ${t.quantity}x ${prodName}`
              break
            case 'return':
              icon = <RotateCcw className="w-4 h-4 text-slate-600" />
              color = "bg-slate-100"
              text = `${userName} devolvió ${t.quantity}x ${prodName}`
              break
            case 'transfer':
              icon = <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              color = "bg-purple-100"
              text = `${userName} transfirió ${t.quantity}x ${prodName}`
              break
          }

          return (
            <div key={t.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
              <div className={`p-2 rounded-full ${color} shrink-0`}>
                {icon}
              </div>
              <span className="text-slate-600 font-medium truncate">{text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
