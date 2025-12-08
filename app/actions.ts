'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- AUTH ---
export async function login(formData: FormData) {
  const supabase = await createClient()
  
  // LOGIC: Convert Username to Email
  let input = formData.get('username') as string // Changed from 'email'
  if (!input) input = formData.get('email') as string // Fallback
  
  // Clean input
  input = input.trim().toLowerCase()
  
  // If user typed just "unai", we append "@stockflow.local"
  const email = input.includes('@') ? input : `${input}@stockflow.local`
  
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "Usuario o contraseña incorrectos" } // Generic error for security
  
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
  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'restock', quantity })
  revalidatePath('/dashboard')
  return { success: true }
}

// --- SELLER ACTIONS ---
export async function withdrawItem(productId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single()
  const { data: profile } = await supabase.from('profiles').select('invested_amount').eq('id', user.id).single()
  
  if (!product || !profile) return { error: 'Error data' }
  if (product.current_stock < quantity) return { error: `Solo quedan ${product.current_stock} unidades` }

  const { data: myHolds } = await supabase.from('inventory_holds').select('quantity, products(cost_price)').eq('user_id', user.id).eq('status', 'held')
  let currentHeldValue = 0
  myHolds?.forEach((h: any) => { currentHeldValue += h.quantity * (h.products?.cost_price || 0) })
  
  const costOfBatch = product.cost_price * quantity
  
  if ((currentHeldValue + costOfBatch) > profile.invested_amount) {
    return { error: `Límite excedido. Te falta crédito.` }
  }

  await supabase.from('products').update({ current_stock: product.current_stock - quantity }).eq('id', productId)
  
  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (hold) {
    await supabase.from('inventory_holds').update({ quantity: hold.quantity + quantity }).eq('id', hold.id)
  } else {
    await supabase.from('inventory_holds').insert({ user_id: user.id, product_id: productId, quantity, status: 'held' })
  }

  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'withdraw', quantity })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function returnItem(productId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!hold || hold.quantity < quantity) return { error: 'No tienes suficiente stock para devolver' }

  await supabase.from('inventory_holds').update({ quantity: hold.quantity - quantity }).eq('id', hold.id)

  const { data: product } = await supabase.from('products').select('current_stock').eq('id', productId).single()
  if (product) {
      await supabase.from('products').update({ current_stock: product.current_stock + quantity }).eq('id', productId)
  }

  await supabase.from('transactions').insert({ user_id: user.id, product_id: productId, type: 'return', quantity })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function sellItem(productId: string, finalPricePerUnit: number, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: hold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!hold || hold.quantity < quantity) return { error: 'No tienes suficiente stock' }

  await supabase.from('inventory_holds').update({ quantity: hold.quantity - quantity }).eq('id', hold.id)
  
  const { data: sold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'sold').single()
  if (sold) {
    await supabase.from('inventory_holds').update({ quantity: sold.quantity + quantity }).eq('id', sold.id)
  } else {
    await supabase.from('inventory_holds').insert({ user_id: user.id, product_id: productId, quantity, status: 'sold' })
  }

  await supabase.from('transactions').insert({
    user_id: user.id, product_id: productId, type: 'sold', quantity, actual_price: finalPricePerUnit * quantity
  })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function transferItem(productId: string, targetUserId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: myHold } = await supabase.from('inventory_holds').select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()
  if (!myHold || myHold.quantity < quantity) return { error: 'No tienes suficiente stock' }

  await supabase.from('inventory_holds').update({ quantity: myHold.quantity - quantity }).eq('id', myHold.id)
  
  const { data: targetHold } = await supabase.from('inventory_holds').select('*').eq('user_id', targetUserId).eq('product_id', productId).eq('status', 'held').single()
  if (targetHold) {
    await supabase.from('inventory_holds').update({ quantity: targetHold.quantity + quantity }).eq('id', targetHold.id)
  } else {
    await supabase.from('inventory_holds').insert({ user_id: targetUserId, product_id: productId, quantity, status: 'held' })
  }

  await supabase.from('transactions').insert({
    user_id: user.id, target_user_id: targetUserId, product_id: productId, type: 'transfer', quantity
  })
  revalidatePath('/dashboard')
  return { success: true }
}

// --- CAPITAL MANAGEMENT (BATCHES) ---
export async function registerBatchContribution(batchName: string, contributions: { userId: string, amount: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify Admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  for (const contrib of contributions) {
    if (contrib.amount > 0) {
      // 1. Log entry
      const { error: logError } = await supabase.from('capital_entries').insert({
        batch_name: batchName,
        user_id: contrib.userId,
        amount: contrib.amount
      })
      if (logError) console.error('Error logging capital:', logError)

      // 2. Update User Balance (Invested Amount) - Increment
      // Fetch current to add safely (or use RPC if strict concurrency needed, but loop is fine here)
      const { data: current } = await supabase.from('profiles').select('invested_amount').eq('id', contrib.userId).single()
      if (current) {
        await supabase.from('profiles').update({ 
          invested_amount: current.invested_amount + contrib.amount 
        }).eq('id', contrib.userId)
      }
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}