import { createContext, useEffect, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  veg: boolean;
  category: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: { id: string; name: string; price: number; veg: boolean; category: string }) => void;
  updateQty: (id: string, delta: number) => void;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // 1. INITIALIZE FROM STORAGE
  // Instead of starting with [], we check memory first.
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('pabee_active_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      return [];
    }
  });

  const addToCart = (item: { id: string; name: string; price: number; veg: boolean; category: string }) => {
    setCart((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      
      if (existingItem) {
        // If it already exists, just increase the quantity
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        veg: item.veg, 
        category: item.category,
        qty: 1 
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => 
      prev.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
          .filter((i) => i.qty > 0)
    );
  };

  useEffect(() => {
    localStorage.setItem('pabee_active_cart', JSON.stringify(cart));
  }, [cart]);

  const clearCart = () => {
    setCart([]); 
    localStorage.removeItem('pabee_active_cart');
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQty, cartTotal, cartCount, clearCart}}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}