import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function QuickPOS({ vendorId }: { vendorId: string }) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [posCart, setPosCart] = useState<any[]>([]);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch the menu for the POS buttons
  useEffect(() => {
    const fetchMenu = async () => {
      const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`);
        if (res.ok) {
          const data = await res.json();
          setMenuItems(data.items || []);
        }
      } catch (err) {
        console.error("POS Menu fetch failed", err);
      }
    };
    fetchMenu();
  }, [vendorId]);

  // 2. POS Cart Logic
  const addToPos = (item: any) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const clearPos = () => {
    setPosCart([]);
    setReference('');
    setPhone('');
  };

  const posTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // 3. The API Hijack (Reusing your Checkout logic)
  const submitManualOrder = async (paymentMode: 'CASH' | 'UPI') => {
    if (posCart.length === 0) return toast.error("Cart is empty!");
    setIsSubmitting(true);

    const orderPayload = {
      vendorId,
      tableId: "Counter", // Flag this so you know it was a walk-up
      customerName: reference.trim() || "Counter Order",
      customerPhone: phone.trim().length === 10 ? phone.trim() : "0000000000",
      paymentMode: paymentMode,
      total: posTotal,
      items: posCart.map(c => ({ name: c.name, qty: c.qty, price: c.price }))
    };

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (orderRes.ok) {
        const data = await orderRes.json();
        toast.success(`Token #${data.tokenNumber} Generated!`);
        clearPos();
      } else {
        toast.error("Failed to push to queue");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-4 mt-6">
      <h2 className="text-[#E5B35C] font-bold text-lg mb-4 flex items-center gap-2">
        <span>⚡</span> Quick POS
      </h2>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* LEFT SIDE: Tap-to-Add Menu Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 h-64 overflow-y-auto no-scrollbar pr-2">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => addToPos(item)}
              className="bg-[#1A1D24] hover:bg-[#2A2E39] border border-gray-800 rounded-xl p-3 text-left transition-colors active:scale-95 flex flex-col justify-between h-20"
            >
              <span className="text-sm font-bold text-gray-200 line-clamp-1">{item.name}</span>
              <span className="text-xs text-[#E5B35C] font-mono">₹{item.price}</span>
            </button>
          ))}
        </div>

        {/* RIGHT SIDE: The Counter Cart */}
        <div className="w-full md:w-80 bg-[#0A0A0A] border border-gray-800 rounded-xl p-4 flex flex-col">
          
          <input 
            type="text" 
            placeholder="Identifier (e.g. Red Shirt) - Optional" 
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full bg-[#1A1D24] text-xs text-white p-2.5 rounded-lg border border-gray-800 mb-3 outline-none focus:border-[#E5B35C]"
          />

          {/* 🌟 NEW PHONE NUMBER FIELD */}
          <input 
            type="tel" 
            placeholder="Phone Number - Optional" 
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} // Strips non-numbers
            maxLength={10}
            className="w-full bg-[#1A1D24] text-xs text-white p-2.5 rounded-lg border border-gray-800 mb-3 outline-none focus:border-[#E5B35C]"
          />

          <div className="flex-1 overflow-y-auto min-h-[100px] mb-3 space-y-2">
            {posCart.length === 0 ? (
              <p className="text-gray-600 text-xs text-center mt-4">No items added</p>
            ) : (
              posCart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-300">
                  <span>{item.qty}x {item.name}</span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-800 pt-3 mb-4 flex justify-between items-center">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total</span>
            <span className="text-[#E5B35C] text-xl font-black">₹{posTotal}</span>
          </div>

          <div className="flex gap-2">
            <button 
              disabled={isSubmitting || posCart.length === 0}
              onClick={() => submitManualOrder('CASH')}
              className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-lg text-xs hover:bg-gray-700 disabled:opacity-50"
            >
              💵 CASH
            </button>
            <button 
              disabled={isSubmitting || posCart.length === 0}
              onClick={() => submitManualOrder('UPI')}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              ⚡ UPI
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}