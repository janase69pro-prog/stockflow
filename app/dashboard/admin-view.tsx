'use client'

import { useState } from 'react'
import { Product, Transaction } from '@/types'
import { createProduct, restockProduct, registerBatchContribution } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Archive, BarChart3, Package, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function AdminView({ products, transactions, allUsers }: { products: Product[], transactions: Transaction[], allUsers: { id: string, name: string, email: string }[] }) {
  const [isRestocking, setIsRestocking] = useState<string | null>(null)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)

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

  async function handleBatchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const batchName = formData.get('batchName') as string
    
    const contributions = allUsers.map(u => ({
      userId: u.id,
      amount: parseFloat(formData.get(`amount_${u.id}`) as string) || 0
    })).filter(c => c.amount > 0)

    if (contributions.length === 0) return alert("Introduce al menos una cantidad")

    const res = await registerBatchContribution(batchName, contributions)
    if (res?.error) alert(res.error)
    else {
      alert("Lote registrado y saldos actualizados")
      setIsBatchModalOpen(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
        <div className="flex gap-2">
            <Button onClick={() => setIsBatchModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Wallet className="w-4 h-4" /> Registrar Lote / Capital
            </Button>
            <Link href="/dashboard/stats">
            <Button variant="outline" className="gap-2 shadow-sm border-slate-300 text-slate-700 bg-white hover:bg-slate-50">
                <BarChart3 className="w-4 h-4" /> Estadísticas
            </Button>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* Create Product Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-sm font-semibold uppercase text-slate-500 mb-4 flex items-center gap-2 tracking-wider"><Plus className="w-4 h-4" /> Alta de Producto</h2>
                <form action={handleCreate} className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div className="col-span-2 md:col-span-2 space-y-1"><label className="text-xs font-bold text-slate-600">Nombre</label><Input name="name" required placeholder="Ej: Camiseta..." /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Variación</label><Input name="variation" placeholder="Talla/Color" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Coste (€)</label><Input name="cost_price" type="number" step="0.01" required placeholder="0.00" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600">PVP (€)</label><Input name="price" type="number" step="0.01" required placeholder="0.00" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Stock Ini.</label><Input name="stock" type="number" required placeholder="0" /></div>
                <div className="col-span-2 md:col-span-6 flex justify-end mt-2"><Button type="submit" className="bg-slate-900 text-white w-full md:w-auto">Crear Producto</Button></div>
                </form>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><Package className="w-4 h-4" /> Inventario Actual</h2><span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-bold">{products.length} Items</span></div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100"><tr><th className="px-6 py-3 font-semibold">Producto</th><th className="px-6 py-3 font-semibold">Coste</th><th className="px-6 py-3 font-semibold text-right">PVP</th><th className="px-6 py-3 font-semibold text-center">Stock</th><th className="px-6 py-3 font-semibold text-right">Gestión</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{p.name} <span className="text-slate-400 font-normal ml-1">{p.variation}</span></td>
                        <td className="px-6 py-4 text-slate-500">{p.cost_price.toFixed(2)} €</td>
                        <td className="px-6 py-4 text-right font-medium">{p.price.toFixed(2)} €</td>
                        <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${p.current_stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.current_stock}</span></td>
                        <td className="px-6 py-4 text-right">
                            {isRestocking === p.id ? (
                            <form action={(fd) => handleRestock(p.id, fd)} className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-4 duration-200"><Input name="qty" type="number" className="w-20 h-8 text-right" placeholder="+0" autoFocus /><Button size="sm" type="submit" className="h-8 px-3">Guardar</Button></form>
                            ) : (<Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-slate-100 text-slate-600" onClick={() => setIsRestocking(p.id)}>+ Stock</Button>)}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>

        {/* Sidebar (Right) */}
        <div className="lg:col-span-1">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Actividad Reciente</h3>
                <div className="space-y-4">
                    {transactions.map((t) => {
                         const userName = t.profiles?.name || "Usuario"
                         const prodName = t.products?.name || "Producto"
                         let text = `${userName} ${t.type} ${t.quantity} ${prodName}`
                         if(t.type === 'sold') text = `${userName} vendió ${t.quantity} ${prodName}`
                         if(t.type === 'withdraw') text = `${userName} retiró ${t.quantity} ${prodName}`
                         if(t.type === 'return') text = `${userName} devolvió ${t.quantity} ${prodName}`
                         if(t.type === 'transfer') text = `${userName} transfirió ${t.quantity} ${prodName}`
                         if(t.type === 'restock') text = `Admin repuso ${t.quantity} ${prodName}`
                         
                         return (
                             <div key={t.id} className="text-sm border-b border-slate-50 pb-2 last:border-0">
                                 <p className="text-slate-600">{text}</p>
                                 <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</p>
                             </div>
                         )
                    })}
                    {transactions.length === 0 && <p className="text-slate-400 text-sm">Sin movimientos.</p>}
                </div>
             </div>
        </div>
      </div>

      {/* BATCH MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Registrar Aportación / Lote</h2>
                <form onSubmit={handleBatchSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-slate-700">Nombre del Lote / Concepto</label>
                        <Input name="batchName" placeholder="Ej: Compra Sudaderas Noviembre" required />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-3 border p-3 rounded bg-slate-50">
                        {allUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">{u.name || u.email}</span>
                                <div className="flex items-center gap-2">
                                    <Input name={`amount_${u.id}`} type="number" step="0.01" placeholder="0€" className="w-24 text-right bg-white" />
                                    <span className="text-slate-400">€</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsBatchModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="bg-blue-600 text-white">Registrar Aportaciones</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}