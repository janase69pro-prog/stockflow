'use client'

import { useState } from 'react'
import { Product, InventoryHold, Profile } from '@/types'
import { withdrawItem, sellItem, transferItem } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

export default function SellerView({ products, myHolds, profile, allUsers }: { products: Product[], myHolds: InventoryHold[], profile: Profile, allUsers: { id: string, name: string }[] }) {
  const [sellingItem, setSellingItem] = useState<{id: string, name: string, price: number} | null>(null)
  const [transferringItem, setTransferringItem] = useState<{id: string, name: string} | null>(null)

  const heldItems = myHolds.filter(h => h.status === 'held')
  const soldItems = myHolds.filter(h => h.status === 'sold')
  const totalHeldValue = heldItems.reduce((acc, h) => acc + (h.quantity * (h.products?.cost_price || 0)), 0)
  const creditAvailable = profile.invested_amount - totalHeldValue
  const getMyQty = (pid: string) => heldItems.find(h => h.product_id === pid)?.quantity || 0

  // Wrappers
  async function handleWithdraw(productId: string) {
    const res = await withdrawItem(productId)
    if (res?.error) alert(res.error)
  }

  async function handleSell(formData: FormData) {
    if (!sellingItem) return
    const price = parseFloat(formData.get('price') as string)
    const res = await sellItem(sellingItem.id, price)
    if (res?.error) alert(res.error)
    setSellingItem(null)
  }

  async function handleTransfer(formData: FormData) {
    if (!transferringItem) return
    const targetId = formData.get('targetId') as string
    const res = await transferItem(transferringItem.id, targetId)
    if (res?.error) alert(res.error)
    setTransferringItem(null)
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xs font-bold text-slate-500 uppercase">Crédito Disponible</h3>
        <div className="flex justify-between items-end"><span className="text-2xl font-bold">{creditAvailable.toFixed(2)} €</span><span className="text-sm text-slate-500">de {profile.invested_amount} €</span></div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {products.map((p) => {
          const myQty = getMyQty(p.id)
          const canAfford = creditAvailable >= p.cost_price
          return (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
              <div className="flex justify-between"><div><h3 className="font-bold text-lg">{p.name}</h3><p className="text-xs text-slate-400">Coste: {p.cost_price}€</p></div><span className="font-bold">{p.price} €</span></div>
              <div className="flex gap-2 text-xs"><div className="bg-slate-100 px-2 py-1 rounded">Stock: <b>{p.current_stock}</b></div>{myQty > 0 && <div className="bg-amber-100 px-2 py-1 rounded">Tienes: <b>{myQty}</b></div>}</div>
              <div className="grid grid-cols-2 gap-3">
                <form action={() => handleWithdraw(p.id)}><Button variant="outline" className="w-full" disabled={p.current_stock < 1 || !canAfford}>Retirar</Button></form>
                <Button className="w-full bg-green-600" disabled={myQty < 1} onClick={() => setSellingItem(p)}>Vender</Button>
              </div>
              {myQty > 0 && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setTransferringItem(p)}><Send className="w-3 h-3 mr-1"/> Transferir</Button>}
            </div>
          )
        })}
      </div>

      {sellingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold">Vender {sellingItem.name}</h3>
            <form action={handleSell}>
              <label className="text-xs font-bold">Precio Final (€)</label>
              <Input name="price" type="number" step="0.01" defaultValue={sellingItem.price} className="text-lg font-bold mb-4" autoFocus />
              <div className="grid grid-cols-2 gap-3"><Button type="button" variant="ghost" onClick={() => setSellingItem(null)}>Cancelar</Button><Button type="submit">Confirmar</Button></div>
            </form>
          </div>
        </div>
      )}

      {transferringItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold">Transferir {transferringItem.name}</h3>
            <form action={handleTransfer}>
              <select name="targetId" className="w-full p-3 border rounded-md mb-4 bg-white" required>
                <option value="">Selecciona Vendedor...</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3"><Button type="button" variant="ghost" onClick={() => setTransferringItem(null)}>Cancelar</Button><Button type="submit">Enviar</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
