export type Role = 'admin' | 'seller';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  invested_amount: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  variation: string | null;
  current_stock: number;
  price: number;
  cost_price: number;
  image_url: string | null;
  created_at: string;
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
