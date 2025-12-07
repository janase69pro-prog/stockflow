'use client'

import { useState } from 'react'
import { Product, InventoryHold, Profile } from '@/types'
import { withdrawItem, sellItem, transferItem, returnItem } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Wallet, Tag, PackageCheck, RotateCcw, Minus, Plus, Banknote } from 'lucide-react'

export default function SellerView({ products, myHolds, profile, allUsers }: { products: Product[], myHolds: InventoryHold[], profile: Profile, allUsers: { id: string, name: string, email: string }[] }) {
  const [sellingItem, setSellingItem] = useState<{id: string, name: string, price: number} | null>(null)
  const [transferringItem, setTransferringItem] = useState<{id: string, name: string} | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const heldItems = myHolds.filter(h => h.status === 'held')
  const soldItems = myHolds.filter(h => h.status === 'sold')
  
  const totalHeldValue = heldItems.reduce((acc, h) => acc + (h.quantity * (h.products?.cost_price || 0)), 0)
  const totalDebt = soldItems.reduce((acc, s) => acc + (s.quantity * (s.products?.cost_price || 0)), 0)
  
  const creditAvailable = profile.invested_amount - totalHeldValue
  const creditPercent = profile.invested_amount > 0 ? (totalHeldValue / profile.invested_amount) * 100 : 0
  const getMyQty = (pid: string) => heldItems.find(h => h.product_id === pid)?.quantity || 0

  // Helpers for Qty
  const getQty = (pid: string) => quantities[pid] || 1
  const incQty = (pid: string) => setQuantities(prev => ({ ...prev, [pid]: (prev[pid] || 1) + 1 }))
  const decQty = (pid: string) => setQuantities(prev => ({ ...prev, [pid]: Math.max(1, (prev[pid] || 1) - 1) }))

  async function handleWithdraw(productId: string) {
    const qty = getQty(productId)
    const res = await withdrawItem(productId, qty)
    if (res?.error) alert(res.error)
    setQuantities(prev => ({ ...prev, [productId]: 1 })) // Reset to 1
  }

  async function handleReturn(productId: string) {
    const qty = getQty(productId)
    if(!confirm(`¿Devolver ${qty} unidades al almacén?`)) return;
    const res = await returnItem(productId, qty)
    if (res?.error) alert(res.error)
    setQuantities(prev => ({ ...prev, [productId]: 1 }))
  }

  async function handleSell(formData: FormData) {
    if (!sellingItem) return
    const price = parseFloat(formData.get('price') as string)
    const qty = getQty(sellingItem.id)
    const res = await sellItem(sellingItem.id, price, qty)
    if (res?.error) alert(res.error)
    setSellingItem(null)
    setQuantities(prev => ({ ...prev, [sellingItem.id]: 1 }))
  }

  async function handleTransfer(formData: FormData) {
    if (!transferringItem) return
    const targetId = formData.get('targetId') as string
    const qty = getQty(transferringItem.id)
    const res = await transferItem(transferringItem.id, targetId, qty)
    if (res?.error) alert(res.error)
    setTransferringItem(null)
    setQuantities(prev => ({ ...prev, [transferringItem.id]: 1 }))
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Financial Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Credit Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Crédito Disponible</h3>
            <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold tracking-tight">{creditAvailable.toFixed(2)} €</span>
            <span className="text-sm text-slate-400">/ {profile.invested_amount} €</span>
            </div>
            <div className="relative pt-1">
            <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-slate-700">
                <div style={{ width: `${Math.min(creditPercent, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${creditPercent > 90 ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-500`}></div>
            </div>
            </div>
        </div>

        {/* Debt Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Banknote className="w-24 h-24 text-orange-600" /></div>
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Banknote className="w-4 h-4"/> Dinero a Entregar</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900">{totalDebt.toFixed(2)} €</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Coste acumulado de productos vendidos.</p>
        </div>
      </div>

      <h2 className="font-bold text-lg text-slate-800 px-1">Catálogo de Productos</h2>

      <div className="grid grid-cols-1 gap-4">
        {products.map((p) => {
          const myQty = getMyQty(p.id)
          const currentQty = getQty(p.id)
          const canAfford = creditAvailable >= (p.cost_price * currentQty)
          const isOutOfStock = p.current_stock < currentQty

          return (
            <div key={p.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${myQty > 0 ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{p.name}</h3>
                  <p className="text-slate-500 text-sm mt-0.5">{p.variation || 'Estándar'}</p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-lg text-slate-900">{p.price} €</span>
                  <span className="text-xs text-slate-400 font-medium">PVP</span>
                </div>
              </div>

              <div className="flex gap-2 text-xs mb-4">
                 <div className="bg-slate-100 px-2 py-1.5 rounded-md text-slate-600 font-medium">Almacén: {p.current_stock}</div>
                 {myQty > 0 && <div className="bg-amber-100 px-2 py-1.5 rounded-md text-amber-800 font-bold border border-amber-200 flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Tienes: {myQty}</div>}
              </div>

              {/* QTY SELECTOR */}
              <div className="flex items-center justify-center bg-slate-50 rounded-lg p-1 mb-4 w-fit mx-auto">
                 <button onClick={() => decQty(p.id)} className="w-10 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded shadow-sm"><Minus className="w-4 h-4"/></button>
                 <span className="w-12 text-center font-bold text-slate-900">{currentQty}</span>
                 <button onClick={() => incQty(p.id)} className="w-10 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded shadow-sm"><Plus className="w-4 h-4"/></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <form action={() => handleWithdraw(p.id)} className="w-full">
                  <Button variant="outline" className={`w-full h-11 text-sm ${!canAfford && !isOutOfStock ? 'border-red-200 text-red-600 bg-red-50' : ''}`} disabled={isOutOfStock || !canAfford}>
                    {!canAfford ? 'Sin Fondos' : isOutOfStock ? 'Agotado' : 'Retirar'}
                  </Button>
                </form>
                <Button className="w-full bg-green-600 hover:bg-green-700 h-11 text-white shadow-md shadow-green-100" disabled={myQty < currentQty} onClick={() => setSellingItem(p)}>Vender</Button>
              </div>
              
              {myQty > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-3">
                  <form action={() => handleReturn(p.id)}>
                    <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-red-500 hover:bg-red-50 h-9 text-xs flex justify-center border border-transparent hover:border-red-100" disabled={myQty < currentQty}>
                      <RotateCcw className="w-3 h-3 mr-1.5" /> Devolver
                    </Button>
                  </form>
                  <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-9 text-xs flex justify-center border border-transparent hover:border-blue-100" onClick={() => setTransferringItem(p)} disabled={myQty < currentQty}>
                    <Send className="w-3 h-3 mr-1.5" /> Transferir
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {sellingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm space-y-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300">
            <div className="text-center">
                <h3 className="font-bold text-xl text-slate-900">Vender {getQty(sellingItem.id)} unidades</h3>
                <p className="text-slate-500 text-sm mt-1">{sellingItem.name}</p>
            </div>
            <form action={handleSell} className="space-y-6">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Precio Unitario (€)</label><Input name="price" type="number" step="0.01" defaultValue={sellingItem.price} className="text-3xl font-bold text-center h-16 border-slate-200 focus:border-green-500 focus:ring-green-500" autoFocus /></div>
              <p className="text-center text-sm font-bold text-slate-900">Total: {(sellingItem.price * getQty(sellingItem.id)).toFixed(2)} €</p>
              <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" className="h-12 border-slate-200" onClick={() => setSellingItem(null)}>Cancelar</Button><Button type="submit" className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold">¡Vendido!</Button></div>
            </form>
          </div>
        </div>
      )}

      {transferringItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm space-y-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300">
            <div className="text-center"><h3 className="font-bold text-xl text-slate-900">Transferir {getQty(transferringItem.id)} unidades</h3><p className="text-slate-500 text-sm mt-1">{transferringItem.name}</p></div>
            <form action={handleTransfer} className="space-y-6">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Destinatario</label><select name="targetId" className="w-full h-12 px-3 border border-slate-200 rounded-md bg-white text-base focus:border-blue-500 focus:ring-blue-500" required><option value="">Selecciona compañero...</option>{allUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" className="h-12 border-slate-200" onClick={() => setTransferringItem(null)}>Cancelar</Button><Button type="submit" className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold">Enviar</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}