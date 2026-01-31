import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Funções helper para localStorage
const getStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('seven-cart');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('seven-cart', JSON.stringify(items));
  } catch {
    // Ignora erros
  }
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: getStoredCart(),
  
  addItem: (item) => {
    const items = get().items;
    const existingItem = items.find(i => i.id === item.id);
    
    let newItems: CartItem[];
    if (existingItem) {
      newItems = items.map(i => 
        i.id === item.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
    } else {
      newItems = [...items, { ...item, quantity: 1 }];
    }
    
    set({ items: newItems });
    saveCart(newItems);
  },
  
  removeItem: (id) => {
    const newItems = get().items.filter(i => i.id !== id);
    set({ items: newItems });
    saveCart(newItems);
  },
  
  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
    } else {
      const newItems = get().items.map(i => 
        i.id === id ? { ...i, quantity } : i
      );
      set({ items: newItems });
      saveCart(newItems);
    }
  },
  
  clearCart: () => {
    set({ items: [] });
    saveCart([]);
  },
  
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
  
  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  
  loadFromStorage: () => {
    const items = getStoredCart();
    set({ items });
  },
  
  saveToStorage: () => {
    saveCart(get().items);
  },
}));
