'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- AUTH & ADMIN USER MANAGEMENT ---

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

export async function updateInvestment(userId: string, amount: number) {
  const supabase = await createClient()
  
  // Check Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  
  // Update Profile
  const { error } = await supabase
    .from('profiles')
    .update({ invested_amount: amount })
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

// --- PRODUCT MANAGEMENT (ADMIN) ---

export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const variation = formData.get('variation') as string
  const price = parseFloat(formData.get('price') as string)
  const cost_price = parseFloat(formData.get('cost_price') as string)
  const stock = parseInt(formData.get('stock') as string)

  const { error } = await supabase.from('products').insert({
    name,
    variation,
    price,
    cost_price,
    current_stock: stock,
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
  
  await supabase.from('products')
    .update({ current_stock: product.current_stock + quantity })
    .eq('id', productId)

  await supabase.from('transactions').insert({
    user_id: user.id,
    product_id: productId,
    type: 'restock',
    quantity: quantity
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// --- SELLER ACTIONS ---

export async function withdrawItem(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Obtener Datos del Producto y del Usuario
  const { data: product } = await supabase
    .from('products')
    .select('current_stock, cost_price, name')
    .eq('id', productId)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('invested_amount')
    .eq('id', user.id)
    .single()

  if (!product || !profile) return { error: 'Error fetching data' }
  if (product.current_stock < 1) return { error: 'Sin stock disponible' }

  // 2. CALCULAR CRÉDITO DISPONIBLE
  const { data: myHolds } = await supabase
    .from('inventory_holds')
    .select('quantity, products(cost_price)')
    .eq('user_id', user.id)
    .eq('status', 'held')

  let currentHeldValue = 0
  myHolds?.forEach((h: any) => {
    currentHeldValue += h.quantity * (h.products?.cost_price || 0)
  })

  const newTotalValue = currentHeldValue + product.cost_price

  if (newTotalValue > profile.invested_amount) {
    return { 
      error: `Límite excedido. Tienes ${currentHeldValue}€ en productos y tu límite es ${profile.invested_amount}€.` 
    }
  }

  // 3. Decrement Stock
  await supabase.from('products')
    .update({ current_stock: product.current_stock - 1 })
    .eq('id', productId)

  // 4. Add to User's "Held" Inventory
  const { data: existingHold } = await supabase
    .from('inventory_holds')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('status', 'held')
    .single()

  if (existingHold) {
    await supabase.from('inventory_holds').update({
      quantity: existingHold.quantity + 1,
      updated_at: new Date().toISOString()
    }).eq('id', existingHold.id)
  } else {
    await supabase.from('inventory_holds').insert({
      user_id: user.id,
      product_id: productId,
      quantity: 1,
      status: 'held'
    })
  }

  // 5. Log Transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    product_id: productId,
    type: 'withdraw',
    quantity: 1
  })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function sellItem(productId: string, finalPrice: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Check Held Stock
  const { data: existingHold } = await supabase
    .from('inventory_holds')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('status', 'held')
    .single()

  if (!existingHold || existingHold.quantity < 1) {
    return { error: 'No tienes este producto en mano' }
  }

  // 2. Decrement Held
  await supabase.from('inventory_holds').update({
    quantity: existingHold.quantity - 1,
    updated_at: new Date().toISOString()
  }).eq('id', existingHold.id)

  // 3. Increment "Sold"
  const { data: soldHold } = await supabase
    .from('inventory_holds')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('status', 'sold')
    .single()

  if (soldHold) {
    await supabase.from('inventory_holds').update({
      quantity: soldHold.quantity + 1,
      updated_at: new Date().toISOString()
    }).eq('id', soldHold.id)
  } else {
    await supabase.from('inventory_holds').insert({
      user_id: user.id,
      product_id: productId,
      quantity: 1,
      status: 'sold'
    })
  }

  // 4. Log Transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    product_id: productId,
    type: 'sold',
    quantity: 1,
    actual_price: finalPrice
  })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function transferItem(productId: string, targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Check my stock
  const { data: myHold } = await supabase.from('inventory_holds')
    .select('*').eq('user_id', user.id).eq('product_id', productId).eq('status', 'held').single()

  if (!myHold || myHold.quantity < 1) return { error: 'No tienes stock para transferir' }

  // 2. Remove from me
  await supabase.from('inventory_holds')
    .update({ quantity: myHold.quantity - 1, updated_at: new Date().toISOString() })
    .eq('id', myHold.id)

  // 3. Add to target
  const { data: targetHold } = await supabase.from('inventory_holds')
    .select('*').eq('user_id', targetUserId).eq('product_id', productId).eq('status', 'held').single()

  if (targetHold) {
    await supabase.from('inventory_holds')
      .update({ quantity: targetHold.quantity + 1, updated_at: new Date().toISOString() })
      .eq('id', targetHold.id)
  } else {
    await supabase.from('inventory_holds').insert({
      user_id: targetUserId, product_id: productId, quantity: 1, status: 'held'
    })
  }

  // 4. Log Transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    target_user_id: targetUserId,
    product_id: productId,
    type: 'transfer',
    quantity: 1
  })

  revalidatePath('/dashboard')
  return { success: true }
}
