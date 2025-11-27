import { Product, User, UserRole, Order } from '../types';

const KEYS = {
  USERS: 'org_users',
  PRODUCTS: 'org_products',
  ORDERS: 'org_orders',
  CURRENT_USER: 'org_current_user'
};

// Seed Data
const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Tomate Orgânico',
    description: 'Tomates vermelhos e suculentos, cultivados sem agrotóxicos.',
    price: 8.50,
    unit: 'kg',
    category: 'Legumes',
    imageUrl: 'https://picsum.photos/seed/tomato/400/400',
    stock: 50
  },
  {
    id: '2',
    name: 'Alface Crespa',
    description: 'Folhas verdes crocantes, colhidas hoje de manhã.',
    price: 3.00,
    unit: 'un',
    category: 'Verduras',
    imageUrl: 'https://picsum.photos/seed/lettuce/400/400',
    stock: 30
  },
  {
    id: '3',
    name: 'Cenoura Baby',
    description: 'Cenouras doces e crocantes, perfeitas para snacks.',
    price: 6.20,
    unit: 'pacote',
    category: 'Legumes',
    imageUrl: 'https://picsum.photos/seed/carrot/400/400',
    stock: 25
  },
  {
    id: '4',
    name: 'Morangos Frescos',
    description: 'Morangos doces direto do produtor.',
    price: 15.00,
    unit: 'caixa',
    category: 'Frutas',
    imageUrl: 'https://picsum.photos/seed/strawberry/400/400',
    stock: 15
  }
];

export const storage = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    if (!data) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  },

  saveProduct: (product: Product): void => {
    const products = storage.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  deleteProduct: (id: string): void => {
    const products = storage.getProducts().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User): void => {
    const users = storage.getUsers();
    users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  login: (email: string, password: string): User | null => {
    // Admin Backdoor for Demo
    if (email === 'admin@organico.com' && password === 'admin') {
        const adminUser: User = { id: 'admin', name: 'Administrador', email, role: UserRole.ADMIN };
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(adminUser));
        return adminUser;
    }

    const users = storage.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password, ...safeUser } = user;
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(safeUser));
      return safeUser as User;
    }
    return null;
  },

  logout: (): void => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  saveOrder: (order: Order): void => {
    const data = localStorage.getItem(KEYS.ORDERS);
    const orders = data ? JSON.parse(data) : [];
    orders.push(order);
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },
  
  getOrders: (): Order[] => {
     const data = localStorage.getItem(KEYS.ORDERS);
     return data ? JSON.parse(data) : [];
  }
};
