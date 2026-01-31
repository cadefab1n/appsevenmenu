import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

// Storage simples para web
const webStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

// Escolher storage baseado na plataforma
const storage = Platform.OS === 'web' 
  ? createJSONStorage(() => webStorage)
  : createJSONStorage(() => AsyncStorage);

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find(i => i.id === item.id);
        
        if (existingItem) {
          set({
            items: items.map(i => 
              i.id === item.id 
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          });
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] });
        }
      },
      
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
        } else {
          set({
            items: get().items.map(i => 
              i.id === id ? { ...i, quantity } : i
            )
          });
        }
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'seven-cart',
      storage: storage,
    }
  )
);
