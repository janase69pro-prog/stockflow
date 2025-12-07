'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- AUTH & ADMIN ---
export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

// --- PRODUCT (ADMIN) ---
export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const variation = formData.get('variation') as string
  const price = parseFloat(formData.get('price') as string)
  const cost_price = parseFloat(formData.get('cost_price') as string)
  const stock = parseInt(formData.get('stock') as string)

  const { error } = await supabase.from('products').insert({
    name, variation, price, cost_price, current_stock: stock
  })
  if (error) return { error: error.message }
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
  await supabase.from('transactions').insert({
    user_id: user.id, product_id: productId, type: 'restock', quantity: quantity
  })
  revalidatePath('/dashboard')
  return { success: true }
}

// --- SELLER ACTIONS (V2 FINANCIAL) ---
export async function withdrawItem(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Data
  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single()
  const { data: profile } = await supabase.from('profiles').select('invested_amount').eq('id', user.id).single()
  if (!product || !profile) return { error: 'Error fetching data' }
  if (product.current_stock < 1) return { error: 'Sin stock' }

  // 2. Credit Check
  const { data: myHolds } = await supabase.from('inventory_holds').select('quantity, products(cost_price)').eq('user_id', user.id).eq('status', 'held')
  let currentHeldValue = 0
  myHolds?.forEach((h: any) => { currentHeldValue += h.quantity * (h.products?.cost_price || 0) })

  if ((currentHeldValue + product.cost_price) > profile.invested_amount) {
    return { error: `Límite de crédito excedido. Disponible: ${profile.invested_amount - currentHeldValue}€` }
  }

  // 3. Exec
  await supabase.from('products').update({ current_stock: product.current_stock - 1 }).eq('id', productId)
  
  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (hold) {
    await supabase.from('inventory_holds').update({ quantity: hold.quantity + 1 }).eq('id', hold.id)
  } else {
    await supabase.from('inventory_holds').insert({ user_id: user.id, product_id: productId, quantity: 1, status: 'held' })
  }

  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'withdraw', quantity: 1 })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function sellItem(productId: string, finalPrice: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!hold || hold.quantity < 1) return { error: 'No tienes stock' }

  await supabase.from('inventory_holds').update({ quantity: hold.quantity - 1 }).eq('id', hold.id)
  
  const { data: sold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'sold').single()
  if (sold) {
    await supabase.from('inventory_holds').update({ quantity: sold.quantity + 1 }).eq('id', sold.id)
  } else {
    await supabase.from('inventory_holds').insert({ user_id: user.id, product_id: productId, quantity: 1, status: 'sold' })
  }

  await supabase.from('transactions').insert({
    user_id: user.id, product_id: productId, type: 'sold', quantity: 1, actual_price: finalPrice
  })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function transferItem(productId: string, targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: myHold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!myHold || myHold.quantity < 1) return { error: 'No tienes stock' }

  await supabase.from('inventory_holds').update({ quantity: myHold.quantity - 1 }).eq('id', myHold.id)
  
  const { data: targetHold } = await supabase.from('inventory_holds').select('*').eq('user_id', targetUserId).eq('product_id', productId).eq('status', 'held').single()
  if (targetHold) {
    await supabase.from('inventory_holds').update({ quantity: targetHold.quantity + 1 }).eq('id', targetHold.id)
  } else {
    await supabase.from('inventory_holds').insert({ user_id: targetUserId, product_id: productId, quantity: 1, status: 'held' })
  }

  await supabase.from('transactions').insert({
    user_id: user.id, target_user_id: targetUserId, product_id: productId, type: 'transfer', quantity: 1
  })
  revalidatePath('/dashboard')
  return { success: true }
}