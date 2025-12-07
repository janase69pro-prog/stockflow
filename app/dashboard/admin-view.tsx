'use client'

import { useState } from 'react'
import { Product, Transaction } from '@/types'
import { createProduct, restockProduct } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Archive, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function AdminView({ products }: { products: Product[], transactions: Transaction[] }) {
  const [isRestocking, setIsRestocking] = useState<string | null>(null)

  // Wrappers to fix TypeScript return type issues
  async function handleCreate(formData: FormData) {
    const res = await createProduct(formData)
    if (res?.error) alert(res.error)
  }

  async function handleRestock(productId: string, formData: FormData) {
    const qty = parseInt(formData.get('qty') as string)
    const res = await restockProduct(productId, qty)
    if (res?.error) alert(res.error)
    setIsRestocking(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link href="/dashboard/stats">
          <Button variant="outline" className="gap-2"><BarChart3 className="w-4 h-4" /> Ver Estadísticas</Button>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Nuevo Producto</h2>
        <form action={handleCreate} className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]"><label className="text-sm font-medium">Nombre</label><Input name="name" required /></div>
          <div className="w-32"><label className="text-sm font-medium">Var</label><Input name="variation" /></div>
          <div className="w-24"><label className="text-sm font-medium">Coste</label><Input name="cost_price" type="number" step="0.01" required /></div>
          <div className="w-24"><label className="text-sm font-medium">PVP</label><Input name="price" type="number" step="0.01" required /></div>
          <div className="w-24"><label className="text-sm font-medium">Stock</label><Input name="stock" type="number" required /></div>
          <Button type="submit">Crear</Button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50"><h2 className="font-semibold flex items-center gap-2"><Archive className="w-4 h-4" /> Inventario</h2></div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Coste</th><th className="px-4 py-3 text-right">PVP</th><th className="px-4 py-3 text-center">Stock</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{p.name} <span className="text-slate-500">({p.variation})</span></td>
                <td className="px-4 py-3 text-slate-500">{p.cost_price} €</td>
                <td className="px-4 py-3 text-right">{p.price} €</td>
                <td className={`px-4 py-3 text-center font-bold ${p.current_stock < 5 ? 'text-red-500' : 'text-green-600'}`}>{p.current_stock}</td>
                <td className="px-4 py-3 text-right">
                  {isRestocking === p.id ? (
                    <form action={(fd) => handleRestock(p.id, fd)} className="flex justify-end gap-2">
                      <Input name="qty" type="number" className="w-20 h-8" autoFocus /><Button size="sm" type="submit" className="h-8">OK</Button>
                    </form>
                  ) : (<Button variant="outline" className="h-8 text-xs" onClick={() => setIsRestocking(p.id)}>Reponer</Button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
