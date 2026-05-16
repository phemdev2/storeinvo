// lib/types.ts

// ── Branch & Auth Types ──────────────────────────
export interface Branch {
  id: string;
  name: string;
  location?: string; // ✅ ADDED: Optional to fix the TypeScript build error
}

// ── Product & Variant Types ───────────────────────
export interface Variant {
  id: string | number;
  n: string; 
  q: number; 
  p: number; 
  is_var?: boolean;
}

export interface Product {
  id: string | number;
  n: string; 
  b: string; 
  p: number; 
  s: number; 
  v: Variant[];
  is_var?: boolean;
  cost?: number; // ✅ ADDED: Used for profit calculations in the dashboard
}

// ── Cart & Order Types ────────────────────────────
export interface CartItem {
  id: string | number;
  n: string;
  b: string;
  p: number;
  v_name: string | null;
  vid: string | null;
  qty: number;
}

export interface CartSession {
  number: number;
  items: Record<string, CartItem>;
  discount: number;
  discountType: 'fixed' | 'percent';
}

export const CURRENCY = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 });

export interface Order {
  id: string;
  date: string;
  method: string;
  items: CartItem[];
  total: number;
  raw_total: number;
  user_name: string;
  customer_name?: string | null; 
  customer_phone?: string | null;
}

// ── Database Direct Mapping Types ─────────────────
export interface DatabaseProduct {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  variants: DatabaseVariant[];
}

export interface DatabaseVariant {
  id: number;
  product_id: number;
  variant_name: string;
  unit_qty: number;
  price: number;
}