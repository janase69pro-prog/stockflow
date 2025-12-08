'use client'

import { useState } from 'react'
import { Product, InventoryHold, Profile } from '@/types'
import { withdrawItem, sellItem, transferItem, returnItem } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Wallet, Tag, PackageCheck, RotateCcw, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react'

export default function SellerView({ products, myHolds, profile, allUsers }: { products: Product[], myHolds: InventoryHold[], profile: Profile, allUsers: { id: string, name: string }[] }) {
  // Grouping
  const families: Record<string, Product[]> = {}
  products.forEach(p => { if (!families[p.name]) families[p.name] = []; families[p.name].push(p) })

  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null) // productId
  
  // Existing state logic
  const [sellingItem, setSellingItem] = useState<{id: string, name: string, price: number} | null>(null)
  const [transferringItem, setTransferringItem] = useState<{id: string, name: string} | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const heldItems = myHolds.filter(h => h.status === 'held')
  const soldItems = myHolds.filter(h => h.status === 'sold')
  const totalHeldValue = heldItems.reduce((acc, h) => acc + (h.quantity * (h.products?.cost_price || 0)), 0)
  const creditAvailable = profile.invested_amount - totalHeldValue
  const creditPercent = profile.invested_amount > 0 ? (totalHeldValue / profile.invested_amount) * 100 : 0
  const getMyQty = (pid: string) => heldItems.find(h => h.product_id === pid)?.quantity || 0
  const getQty = (pid: string) => quantities[pid] || 1
  const incQty = (pid: string) => setQuantities(prev => ({ ...prev, [pid]: (prev[pid] || 1) + 1 }))
  const decQty = (pid: string) => setQuantities(prev => ({ ...prev, [pid]: Math.max(1, (prev[pid] || 1) - 1) }))

  async function handleWithdraw(productId: string) {
    const res = await withdrawItem(productId, getQty(productId))
    if (res?.error) alert(res.error)
    setQuantities(prev => ({ ...prev, [productId]: 1 }))
  }
  async function handleReturn(productId: string) {
    if(!confirm("¿Devolver?")) return;
    await returnItem(productId, getQty(productId))
  }
  async function handleSell(formData: FormData) {
    if (!sellingItem) return
    await sellItem(sellingItem.id, parseFloat(formData.get('price') as string), getQty(sellingItem.id))
    setSellingItem(null)
  }
  async function handleTransfer(formData: FormData) {
    if (!transferringItem) return
    await transferItem(transferringItem.id, formData.get('targetId') as string, getQty(transferringItem.id))
    setTransferringItem(null)
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Financial Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Crédito</h3>
        <div className="flex items-baseline gap-2 mb-2"><span className="text-3xl font-bold">{creditAvailable.toFixed(2)} €</span></div>
        <div className="relative pt-1"><div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-slate-700"><div style={{ width: `${Math.min(creditPercent, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${creditPercent > 90 ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-500`}></div></div></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm text-center"><span className="text-slate-500 text-xs font-bold uppercase">En Mano</span><p className="text-2xl font-bold">{heldItems.reduce((acc, c) => acc + c.quantity, 0)}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm text-center"><span className="text-slate-500 text-xs font-bold uppercase">Vendidos</span><p className="text-2xl font-bold">{soldItems.reduce((acc, c) => acc + c.quantity, 0)}</p></div>
      </div>

      <h2 className="font-bold text-lg px-1">Catálogo</h2>

      <div className="space-y-4">
        {Object.entries(families).map(([famName, items]) => {
            const isExpanded = expandedFamily === famName
            const basePrice = items[0].price
            const totalMyQty = items.reduce((acc, i) => acc + getMyQty(i.id), 0)
            
            return (
                <div key={famName} className={`bg-white rounded-2xl shadow-sm border transition-all ${isExpanded ? 'ring-2 ring-blue-100' : ''}`}>
                    {/* Header Card */}
                    <div className="p-5 flex justify-between items-center cursor-pointer" onClick={() => setExpandedFamily(isExpanded ? null : famName)}>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{famName}</h3>
                            <p className="text-xs text-slate-500">{items.length} Variantes</p>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-lg text-slate-900">{basePrice} €</span>
                            {totalMyQty > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Tienes {totalMyQty}</span>}
                        </div>
                    </div>

                    {/* Expanded Variants List */}
                    {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-2xl divide-y divide-slate-100">
                            {items.map(p => {
                                const myQty = getMyQty(p.id)
                                const currentQty = getQty(p.id)
                                const canAfford = creditAvailable >= (p.cost_price * currentQty)
                                const isOutOfStock = p.current_stock < currentQty

                                return (
                                    <div key={p.id} className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-slate-700">{p.variation || 'Estándar'}</span>
                                            <div className="text-xs flex gap-2">
                                                <span className="bg-white px-2 py-1 rounded border">Stock: {p.current_stock}</span>
                                                {myQty > 0 && <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200 font-bold">Tienes: {myQty}</span>}
                                            </div>
                                        </div>

                                        {/* Qty Selector */}
                                        <div className="flex items-center justify-center mb-3">
                                            <button onClick={() => decQty(p.id)} className="w-8 h-8 flex items-center justify-center bg-white rounded border"><Minus className="w-3 h-3"/></button>
                                            <span className="w-10 text-center font-bold">{currentQty}</span>
                                            <button onClick={() => incQty(p.id)} className="w-8 h-8 flex items-center justify-center bg-white rounded border"><Plus className="w-3 h-3"/></button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="outline" size="sm" disabled={isOutOfStock || !canAfford} onClick={() => handleWithdraw(p.id)}>Retirar</Button>
                                            <Button className="bg-green-600 text-white" size="sm" disabled={myQty < currentQty} onClick={() => setSellingItem(p)}>Vender</Button>
                                        </div>
                                        
                                        {myQty > 0 && (
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
                                                <Button variant="ghost" size="sm" className="flex-1 text-xs text-slate-400" onClick={() => handleReturn(p.id)}>Devolver</Button>
                                                <Button variant="ghost" size="sm" className="flex-1 text-xs text-slate-400" onClick={() => setTransferringItem(p)}>Transferir</Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )
        })}
      </div>

      {/* Reuse Modals (Selling/Transfer) - Same as before... */}
      {sellingItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="font-bold">Vender {getQty(sellingItem.id)}x {sellingItem.name}</h3>
                <form action={handleSell}>
                    <Input name="price" type="number" step="0.01" defaultValue={sellingItem.price} autoFocus className="text-2xl font-bold text-center" />
                    <div className="grid grid-cols-2 gap-2 mt-4"><Button type="button" variant="ghost" onClick={() => setSellingItem(null)}>Cancelar</Button><Button type="submit" className="bg-green-600 text-white">Confirmar</Button></div>
                </form>
            </div>
        </div>
      )}
      {transferringItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="font-bold">Transferir {getQty(transferringItem.id)}x {transferringItem.name}</h3>
                <form action={handleTransfer}>
                    <select name="targetId" className="w-full p-2 border rounded mb-4" required><option value="">Elegir...</option>{allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                    <div className="grid grid-cols-2 gap-2"><Button type="button" variant="ghost" onClick={() => setTransferringItem(null)}>Cancelar</Button><Button type="submit" className="bg-blue-600 text-white">Enviar</Button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
