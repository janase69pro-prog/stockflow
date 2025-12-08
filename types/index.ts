export type Role = 'admin' | 'seller';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  invested_amount: number;
  must_change_password?: boolean;
  created_at: string;
}

export interface ProductFamily {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  products?: Product[]; // Relación con hijos
}

export interface Product {
  id: string;
  family_id: string;
  name: string; // Se mantiene por compatibilidad, pero es redundante con Family
  variation: string | null;
  current_stock: number;
  price: number; // Heredado o específico
  cost_price: number; // Heredado o específico
  created_at: string;
  product_families?: ProductFamily; // Relación con padre
}

export interface InventoryHold {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  status: 'held' | 'sold';
  updated_at: string;
  products?: Product;
}

export interface Transaction {
  id: string;
  user_id: string;
  product_id: string;
  target_user_id?: string;
  type: 'restock' | 'withdraw' | 'sold' | 'return' | 'transfer';
  quantity: number;
  actual_price?: number;
  created_at: string;
  products?: Product;
  profiles?: Profile;
}