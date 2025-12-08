'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- AUTH ---
export async function login(formData: FormData) {
  const supabase = await createClient()
  let input = formData.get('username') as string 
  if (!input) input = formData.get('email') as string
  input = input.trim().toLowerCase()
  const email = input.includes('@') ? input : `${input}@stockflow.local`
  const password = formData.get('password') as string
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "Credenciales incorrectas" }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// --- PRODUCT FAMILIES (NEW V5) ---
export async function createProductFamily(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const price = parseFloat(formData.get('price') as string)
  const cost_price = parseFloat(formData.get('cost_price') as string)
  
  const { data: family, error: famError } = await supabase.from('product_families').insert({
    name, price, cost_price
  }).select().single()
  
  if (famError || !family) return { error: famError?.message || "Error creating family" }

  const variationsRaw = formData.get('variations') as string
  const initialStock = parseInt(formData.get('stock') as string) || 0
  
  const variants = variationsRaw.split(',').map(s => s.trim()).filter(s => s !== '')
  if (variants.length === 0) variants.push('Estándar')

  for (const v of variants) {
    await supabase.from('products').insert({
      family_id: family.id,
      name: name,
      variation: v,
      price: price,
      cost_price: cost_price,
      current_stock: initialStock
    })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function addVariantToFamily(familyId: string, variationName: string, stock: number) {
  const supabase = await createClient()
  const { data: fam } = await supabase.from('product_families').select('*').eq('id', familyId).single()
  if (!fam) return { error: "Familia no encontrada" }

  await supabase.from('products').insert({
    family_id: familyId,
    name: fam.name,
    variation: variationName,
    price: fam.price,
    cost_price: fam.cost_price,
    current_stock: stock
  })
  revalidatePath('/dashboard')
  return { success: true }
}

// --- LEGACY WRAPPERS ---
export async function createProduct(formData: FormData) { return createProductFamily(formData) }

export async function updateProduct(productId: string, data: { name: string, variation: string, cost_price: number, price: number }) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').update(data).eq('id', productId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) return { error: "Error al borrar" }
  revalidatePath('/dashboard')
  return { success: true }
}

// --- BATCHES ---
export async function registerBatchContribution(
  batchName: string, 
  contributions: { userId: string, amount: number }[],
  stockChanges: { productId: string, quantity: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  for (const contrib of contributions) {
    if (contrib.amount > 0) {
      await supabase.from('capital_entries').insert({ batch_name: batchName, user_id: contrib.userId, amount: contrib.amount })
      const { data: current } = await supabase.from('profiles').select('invested_amount').eq('id', contrib.userId).single()
      if (current) await supabase.from('profiles').update({ invested_amount: current.invested_amount + contrib.amount }).eq('id', contrib.userId)
    }
  }

  for (const stock of stockChanges) {
    if (stock.quantity > 0) {
      const { data: product } = await supabase.from('products').select('current_stock').eq('id', stock.productId).single()
      if (product) {
        await supabase.from('products').update({ current_stock: product.current_stock + stock.quantity }).eq('id', stock.productId)
        await supabase.from('transactions').insert({ user_id: user.id, product_id: stock.productId, type: 'restock', quantity: stock.quantity })
      }
    }
  }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function restockProduct(productId: string, quantity: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
  
    const { data: product } = await supabase.from('products').select('current_stock').eq('id', productId).single()
    if (!product) return { error: "Product not found" }
    
    await supabase.from('products').update({ current_stock: product.current_stock + quantity }).eq('id', productId)
    await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'restock', quantity })
    revalidatePath('/dashboard')
    return { success: true }
  }

// --- SELLER ACTIONS (FIXED) ---
export async function withdrawItem(productId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Data Checks
  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single()
  const { data: profile } = await supabase.from('profiles').select('invested_amount').eq('id', user.id).single()
  if (!product || !profile) return { error: 'Error data' }
  if (product.current_stock < quantity) return { error: 'Stock insuficiente' }

  const { data: myHolds } = await supabase.from('inventory_holds').select('quantity, products(cost_price)').eq('user_id', user.id).eq('status', 'held')
  let currentHeldValue = 0
  myHolds?.forEach((h: any) => { currentHeldValue += h.quantity * (h.products?.cost_price || 0) })
  
  if ((currentHeldValue + (product.cost_price * quantity)) > profile.invested_amount) return { error: 'Límite de crédito excedido' }

  // 2. USE RPC TO DECREMENT GLOBAL STOCK (Bypasses RLS for sellers)
  const { error: rpcError } = await supabase.rpc('withdraw_stock_secure', { p_id: productId, qty: quantity })
  if (rpcError) return { error: 'Error actualizando stock: ' + rpcError.message }

  // 3. Update User Hand
  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  
  if (hold) await supabase.from('inventory_holds').update({ quantity: hold.quantity + quantity }).eq('id', hold.id)
  else await supabase.from('inventory_holds').insert({ user_id: user.id, product_id: productId, quantity, status: 'held' })

  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'withdraw', quantity })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function returnItem(productId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  
  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!hold || hold.quantity < quantity) return { error: 'No tienes stock para devolver' }

  // 1. Decrement Hand
  await supabase.from('inventory_holds').update({ quantity: hold.quantity - quantity }).eq('id', hold.id)
  
  // 2. Increment Global Stock (RPC)
  const { error: rpcError } = await supabase.rpc('return_stock_secure', { p_id: productId, qty: quantity })
  if (rpcError) return { error: rpcError.message }

  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'return', quantity })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function sellItem(productId: string, finalPrice: number, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  
  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!hold || hold.quantity < quantity) return { error: 'No tienes stock' }

  // Move from Held to Sold
  await supabase.from('inventory_holds').update({ quantity: hold.quantity - quantity }).eq('id', hold.id)
  
  const { data: sold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'sold').single()
  if (sold) await supabase.from('inventory_holds').update({ quantity: sold.quantity + quantity }).eq('id', sold.id)
  else await supabase.from('inventory_holds').insert({ user_id: user.id, product_id: productId, quantity, status: 'sold' })

  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'sold', quantity, actual_price: finalPrice * quantity })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function transferItem(productId: string, targetUserId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  
  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!hold || hold.quantity < quantity) return { error: 'No tienes stock' }

  await supabase.from('inventory_holds').update({ quantity: hold.quantity - quantity }).eq('id', hold.id)
  
  const { data: target } = await supabase.from('inventory_holds').select('*').eq('user_id', targetUserId).eq('product_id', productId).eq('status', 'held').single()
  if (target) await supabase.from('inventory_holds').update({ quantity: target.quantity + quantity }).eq('id', target.id)
  else await supabase.from('inventory_holds').insert({ user_id: targetUserId, product_id: productId, quantity, status: 'held' })

  await supabase.from('transactions').insert({ user_id: user.id, target_user_id: targetUserId, product_id: productId, type: 'transfer', quantity })
  revalidatePath('/dashboard')
  return { success: true }
}
