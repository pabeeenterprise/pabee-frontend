import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function QuickPOS({ vendorId }: { vendorId: string }) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [posCart, setPosCart] = useState<any[]>([]);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePromo, setActivePromo] = useState<any | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false); // The toggle switch

  // 1. Fetch the menu & promos
  useEffect(() => {
    const fetchData = async () => {
      const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
      try {
        // Fetch Menu
        const menuRes = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`);
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data.items || []);
        }
        
        // 🚀 Fetch Promos
        const promoRes = await fetch(`${API_URL}/api/vendors/${vendorId}/promos`);
        if (promoRes.ok) {
          const promoData = await promoRes.json();
          const active = promoData.promos?.find((p: any) => p.isActive);
          if (active) setActivePromo(active);
        }
      } catch (err) {
        console.error("POS Data fetch failed", err);
      }
    };
    fetchData();
  }, [vendorId]);

  // 2. POS Cart Logic
  const addToPos = (item: any) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromPos = (itemId: string) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (!existing) return prev;
      
      // If there's only 1 left, nuke it from the cart entirely
      if (existing.qty === 1) {
        return prev.filter(i => i.id !== itemId);
      }
      // Otherwise, just subtract 1
      return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const clearPos = () => {
    setPosCart([]);
    setReference('');
    setPhone('');
  };

  // 🧠 SMART CART MATH
  const rawTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let finalTotal = rawTotal;
  let discountAmt = 0;

  // Only apply if toggle is on, promo exists, and cart meets minimum value
  if (applyDiscount && activePromo && rawTotal >= activePromo.minOrderValue) {
    discountAmt = activePromo.type === 'FLAT' 
      ? activePromo.value 
      : (rawTotal * activePromo.value) / 100;
    finalTotal = Math.max(0, rawTotal - discountAmt);
  }

  // Clear the discount toggle when the cart is emptied
  const handleClearPos = () => {
    clearPos();
    setApplyDiscount(false);
  };

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
      total: finalTotal,
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

          <div className="flex-1 overflow-y-auto min-h-[100px] mb-3 space-y-2 no-scrollbar pr-1">
            {posCart.length === 0 ? (
              <p className="text-gray-600 text-xs text-center mt-4 uppercase tracking-widest font-bold">Cart is empty</p>
            ) : (
              posCart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-gray-300 bg-[#1A1D24] p-2 rounded-lg border border-gray-800/50">
                  
                  {/* Left Side: Controls & Name */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => removeFromPos(item.id)}
                      className="w-6 h-6 bg-red-900/30 text-red-500 rounded flex items-center justify-center font-bold text-lg active:scale-90 transition-transform border border-red-900/50 hover:bg-red-900/50"
                    >
                      −
                    </button>
                    <span className="font-bold text-[#E5B35C] w-4">{item.qty}x</span>
                    <span className="font-medium line-clamp-1">{item.name}</span>
                  </div>

                  {/* Right Side: Price */}
                  <span className="font-bold">₹{item.price * item.qty}</span>
                </div>
              ))
            )}
          </div>

            {/* 🚀 THE DISCOUNT TOGGLE */}
          {activePromo && rawTotal >= activePromo.minOrderValue && (
            <div 
              onClick={() => setApplyDiscount(!applyDiscount)}
              className="flex justify-between items-center bg-[#1A1D24] p-2.5 rounded-lg border border-gray-800 mb-3 cursor-pointer hover:border-gray-700 transition-colors"
            >
              <span className="text-[11px] font-bold text-[#E5B35C] tracking-wide uppercase">
                Apply {activePromo.code}
              </span>
              
              {/* iOS Style Switch */}
              <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors duration-300 ${applyDiscount ? 'bg-green-500' : 'bg-gray-700'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${applyDiscount ? 'translate-x-4' : ''}`}></div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-800 pt-3 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total</span>
              
              {/* 🚨 THE CLEAR ALL KILL-SWITCH */}
              {posCart.length > 0 && (
                <button 
                  onClick={handleClearPos} 
                  className="bg-red-900/20 text-red-500 text-[10px] font-bold uppercase px-2 py-1 rounded border border-red-900/50 hover:bg-red-900/40 active:scale-95 transition-all"
                >
                  Clear Cart
                </button>
              )}
            </div>
            
            {/* 🚨 THE SMART TOTAL DISPLAY */}
            <div className="text-right">
              {applyDiscount && activePromo && rawTotal >= activePromo.minOrderValue && (
                 <span className="text-gray-500 text-xs line-through mr-2">₹{rawTotal}</span>
              )}
              <span className="text-[#E5B35C] text-xl font-black">₹{finalTotal}</span>
            </div>
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