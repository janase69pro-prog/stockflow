'use client'

import { useState } from 'react'
import { Product, Transaction } from '@/types'
import { createProductFamily, addVariantToFamily, restockProduct, registerBatchContribution } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Archive, BarChart3, Package, Wallet, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function AdminView({ products, transactions, allUsers }: { products: Product[], transactions: Transaction[], allUsers: { id: string, name: string, email: string }[] }) {
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({})

  // Group products by name (Family Logic emulation for UI)
  const families: Record<string, Product[]> = {}
  products.forEach(p => {
    if (!families[p.name]) families[p.name] = []
    families[p.name].push(p)
  })

  const toggleFamily = (name: string) => setExpandedFamilies(prev => ({ ...prev, [name]: !prev[name] }))

  async function handleCreateFamily(formData: FormData) {
    const res = await createProductFamily(formData)
    if (res?.error) alert(res.error)
  }

  async function handleAddVariant(familyId: string, name: string, formData: FormData) {
    // Emulation: find family ID from one product (assuming they share it after migration)
    const variantName = formData.get('variation') as string
    const stock = parseInt(formData.get('stock') as string) || 0
    const res = await addVariantToFamily(familyId, variantName, stock)
    if (res?.error) alert(res.error)
  }

  async function handleRestock(productId: string, formData: FormData) {
    const qty = parseInt(formData.get('qty') as string)
    const res = await restockProduct(productId, qty)
    if (res?.error) alert(res.error)
  }

  async function handleBatchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const batchName = formData.get('batchName') as string
    
    const contributions = allUsers.map(u => ({
      userId: u.id,
      amount: parseFloat(formData.get(`amount_${u.id}`) as string) || 0
    })).filter(c => c.amount > 0)

    const stockChanges = products.map(p => ({
        productId: p.id,
        quantity: parseInt(formData.get(`stock_${p.id}`) as string) || 0
    })).filter(s => s.quantity > 0)

    if (contributions.length === 0 && stockChanges.length === 0) return alert("Nada que guardar")

    const res = await registerBatchContribution(batchName, contributions, stockChanges)
    if (res?.error) alert(res.error)
    else setIsBatchModalOpen(false)
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
        <div className="flex gap-2">
            <Button onClick={() => setIsBatchModalOpen(true)} className="bg-blue-600 text-white"><Wallet className="w-4 h-4 mr-2"/> Lote</Button>
            <Link href="/dashboard/stats"><Button variant="outline"><BarChart3 className="w-4 h-4 mr-2"/> Stats</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* Create Family Card */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="font-bold text-sm uppercase text-slate-500 mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> Nuevo Producto (Familia)</h2>
                <form action={handleCreateFamily} className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="col-span-2"><label className="text-xs font-bold">Nombre General</label><Input name="name" placeholder="Ej: Proteína Whey" required /></div>
                    <div><label className="text-xs font-bold">Precio Base</label><Input name="price" type="number" step="0.01" required /></div>
                    <div><label className="text-xs font-bold">Coste Base</label><Input name="cost_price" type="number" step="0.01" required /></div>
                    <div className="col-span-2"><label className="text-xs font-bold">Variantes Iniciales (Separa por comas)</label><Input name="variations" placeholder="Chocolate, Vainilla, Fresa" /></div>
                    <div><label className="text-xs font-bold">Stock x Var.</label><Input name="stock" type="number" defaultValue="0" /></div>
                    <div className="flex justify-end"><Button type="submit" className="bg-slate-900 text-white">Crear</Button></div>
                </form>
            </div>

            {/* Inventory List (Grouped) */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between"><h2 className="font-bold text-slate-800 flex gap-2"><Archive className="w-4 h-4"/> Inventario</h2><span className="text-xs bg-slate-200 px-2 py-1 rounded-full">{Object.keys(families).length} Familias</span></div>
                <div className="divide-y">
                    {Object.entries(families).map(([familyName, items]) => {
                        const totalStock = items.reduce((acc, i) => acc + i.current_stock, 0)
                        const isExpanded = expandedFamilies[familyName]
                        const basePrice = items[0].price
                        const familyId = items[0].family_id // Available after migration

                        return (
                            <div key={familyName} className="bg-white">
                                {/* Parent Row */}
                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50" onClick={() => toggleFamily(familyName)}>
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronRight className="w-4 h-4 text-slate-400"/>}
                                        <div>
                                            <h3 className="font-bold text-slate-900">{familyName}</h3>
                                            <p className="text-xs text-slate-500">{items.length} variantes • {basePrice} €</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-bold ${totalStock < 10 ? 'text-amber-600' : 'text-green-600'}`}>{totalStock} uds</span>
                                    </div>
                                </div>

                                {/* Children Rows (Variants) */}
                                {isExpanded && (
                                    <div className="bg-slate-50 border-t border-b divide-y divide-slate-100">
                                        {items.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 pl-12 text-sm">
                                                <span className="font-medium text-slate-700">{item.variation || 'Estándar'}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-slate-500">Stock: <b>{item.current_stock}</b></span>
                                                    <form action={(fd) => handleRestock(item.id, fd)} className="flex gap-2">
                                                        <Input name="qty" type="number" className="w-16 h-7 text-right bg-white" placeholder="+0" />
                                                        <Button size="sm" type="submit" className="h-7 text-xs">Add</Button>
                                                    </form>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Add Variant Action */}
                                        <div className="p-3 pl-12 bg-slate-100">
                                            <form action={(fd) => handleAddVariant(familyId, familyName, fd)} className="flex gap-2 items-center">
                                                <span className="text-xs font-bold text-slate-500">Nueva Variante:</span>
                                                <Input name="variation" placeholder="Ej: Fresa" className="w-32 h-8 text-xs" required />
                                                <Input name="stock" type="number" placeholder="Stock" className="w-20 h-8 text-xs" />
                                                <Button size="sm" variant="outline" className="h-8 text-xs">Añadir</Button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* Activity Feed Sidebar */}
        <div className="lg:col-span-1">
             <div className="bg-white p-4 rounded-xl border shadow-sm h-full">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b pb-2">Actividad</h3>
                <div className="space-y-3 text-sm">
                    {transactions.map((t) => (
                        <div key={t.id} className="border-b pb-2 last:border-0">
                            <p className="text-slate-600"><span className="font-bold">{t.profiles?.name}</span> {t.type} {t.quantity} {t.products?.name}</p>
                            <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
             </div>
        </div>
      </div>

      {/* BATCH MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Registrar Lote</h2>
                <form onSubmit={handleBatchSubmit} className="space-y-6">
                    <Input name="batchName" placeholder="Nombre del Lote" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border p-4 rounded bg-slate-50">
                            <h3 className="font-bold text-sm mb-2">Aportaciones (€)</h3>
                            {allUsers.map(u => (
                                <div key={u.id} className="flex justify-between items-center mb-2">
                                    <span className="text-sm">{u.name || u.email.split('@')[0]}</span>
                                    <Input name={`amount_${u.id}`} type="number" className="w-24 h-8 text-right" placeholder="0" />
                                </div>
                            ))}
                        </div>
                        <div className="border p-4 rounded bg-slate-50">
                            <h3 className="font-bold text-sm mb-2">Stock Recibido</h3>
                            {Object.entries(families).map(([famName, items]) => (
                                <div key={famName} className="mb-3">
                                    <p className="text-xs font-bold text-slate-500 mb-1">{famName}</p>
                                    {items.map(p => (
                                        <div key={p.id} className="flex justify-between items-center mb-1 pl-2">
                                            <span className="text-xs">{p.variation}</span>
                                            <Input name={`stock_${p.id}`} type="number" className="w-20 h-7 text-right" placeholder="0" />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setIsBatchModalOpen(false)}>Cancelar</Button><Button type="submit" className="bg-blue-600 text-white">Guardar</Button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}