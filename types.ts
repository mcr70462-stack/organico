export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, never store plain text
  role: UserRole;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string; // kg, un, maço
  category: string;
  imageUrl: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'delivered';
  date: string;
  paymentMethod: 'PIX';
}

export type ViewState = 'HOME' | 'LOGIN' | 'REGISTER' | 'ADMIN_PRODUCTS' | 'CART' | 'CHECKOUT' | 'PROFILE';
