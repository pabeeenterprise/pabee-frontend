import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  veg: boolean;
  prep?: string;
  available?: boolean;
}

interface Promo {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderValue: number;
  isActive: boolean;
  expiresAt?: string | null;
}

interface VendorPaymentConfig {
  available: boolean;
  paymentType?: 'UPI' | 'RAZORPAY';
  upiId?: string;
  qrImagePath?: string;
  razorpayKeyId?: string;
}

// 🎨 Prototype pastel tile generator for cross-sell recommendations
const TINTS = ['#F6E7D3', '#F3DCCB', '#EAE3C8', '#E3EBD5', '#F1D9D4', '#E8DFD0'];
const getTint = (id: string) => {
  const hash = [...(id || 'x')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TINTS[hash % TINTS.length];
};

export default function Checkout({
  vendorId,
  tableId,
  onBack,
}: {
  vendorId: string;
  tableId: string;
  onBack: () => void;
}) {
  const { cart, updateQty, addToCart, clearCart } = useCart();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [packIt, setPackIt] = useState(false);
  const [cookNote, setCookNote] = useState('');

  // Promo Engine States
  const [promoCode, setPromoCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [availablePromos, setAvailablePromos] = useState<Promo[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);

  // Payment States
  const [paymentMode, setPaymentMode] = useState<'RAZORPAY' | 'UPI' | 'CASH'>('CASH');
  const [vendorPayment, setVendorPayment] = useState<VendorPaymentConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  // 1. Fetch Vendor Menu (for Cross-Sell Recommendations & Stock Validation)
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu`);
        if (res.ok) {
          const data = await res.json();
          setMenu(data.items || []);
        }
      } catch (err) {
        console.error('Failed to load menu for cross-sells', err);
      }
    };
    if (vendorId) fetchMenu();
  }, [vendorId, API_URL]);

  // 2. Fetch Active Promos
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/promos`);
        if (res.ok) {
          const data = await res.json();
          const valid = (data.promos || []).filter((p: Promo) => {
            const isNotExpired = !p.expiresAt || new Date(p.expiresAt) >= new Date();
            return p.isActive && isNotExpired;
          });
          setAvailablePromos(valid);
        }
      } catch (err) {
        console.error('Failed to load promos', err);
      }
    };
    if (vendorId) fetchPromos();
  }, [vendorId, API_URL]);

  // 3. Fetch Vendor Public Payment Config
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/payment/public`);
        if (res.ok) {
          const data: VendorPaymentConfig = await res.json();
          setVendorPayment(data);

          if (!data.available) {
            setPaymentMode('CASH');
          } else if (data.paymentType === 'RAZORPAY') {
            setPaymentMode('RAZORPAY');
          } else if (data.paymentType === 'UPI') {
            setPaymentMode('UPI');
          }
        }
      } catch (err) {
        console.error('Failed to load payment config', err);
      }
    };
    if (vendorId) fetchPaymentConfig();
  }, [vendorId, API_URL]);

  // 🧮 Calculations
  const itemTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );
  const packingFee = packIt ? 10 : 0;
  const finalTotal = Math.max(0, itemTotal - discountAmount + packingFee);

  // Prototype Cross-Sell Engine: Suggest top 3 available items not in current cart
  const crossSells = useMemo(() => {
    const inCartIds = new Set(cart.map((c) => c.id));
    return menu
      .filter((m) => !inCartIds.has(m.id) && m.available !== false)
      .slice(0, 3);
  }, [menu, cart]);

  // Prototype Prep Time Estimation
  const prepEstimate = useMemo(() => {
    const maxPrep = cart.length
      ? Math.max(
          ...cart.map((c) => {
            const menuItem = menu.find((m) => m.id === c.id);
            return parseInt(menuItem?.prep || '5', 10) || 5;
          })
        )
      : 5;
    const lo = Math.max(3, Math.round(maxPrep * 0.8));
    const hi = Math.max(lo + 2, Math.round(maxPrep * 1.25));
    return `${lo}–${hi}`;
  }, [cart, menu]);

  // 🔊 Prototype Speech Synthesis ("Listen to Order")
  const handleListenOrder = () => {
    if (!('speechSynthesis' in window)) {
      toast('Speech is not supported on this browser', { icon: '🔇' });
      return;
    }
    const orderSummary = cart.map((c) => `${c.qty} ${c.name}`).join(', ');
    const text = `${orderSummary}. Total ${finalTotal} rupees.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  // Promo Verification
  const handleApplyPromo = async (codeToUse?: string) => {
    const code = (codeToUse || promoCode).trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/promos/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartItems: cart }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountAmount(data.discountAmount);
        setAppliedPromoCode(code);
        toast.success(`Promo applied! Saved ₹${data.discountAmount}`);
      } else {
        toast.error(data.error || 'Invalid promo code');
      }
    } catch {
      toast.error('Failed to verify promo code');
    }
  };

  const handleRemovePromo = () => {
    setDiscountAmount(0);
    setAppliedPromoCode(null);
    setPromoCode('');
  };

  // Razorpay Loader
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Pre-Validate Stock with Server
  const checkLiveStock = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu`);
      if (!res.ok) return true;
      const data = await res.json();
      const liveItems: MenuItem[] = data.items || [];

      for (const cartItem of cart) {
        const dish = liveItems.find((m) => m.name.toLowerCase() === cartItem.name.toLowerCase());
        if (dish && dish.available === false) {
          toast.error(`"${cartItem.name}" just ran out of stock. Please remove it.`, { duration: 6000 });
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  };

  // Save Final Order to Backend
  const saveFinalOrderToDatabase = async (finalMode: string): Promise<boolean> => {
    try {
      const orderPayload = {
        vendorId,
        tableId: tableId || 'Counter',
        customerName: customerName.trim() || 'Walk-in',
        customerPhone: phone.trim() || '0000000000',
        paymentMode: finalMode,
        total: finalTotal,
        items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
      };

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Order failed. Check ingredient availability.', { duration: 7000 });
        setIsSubmitting(false);
        return false;
      }

      // Record to Local Order History
      const completedOrder = {
        id: data.id,
        vendorId,
        date: new Date().toISOString(),
        summary: cart.map((c) => `${c.qty}x ${c.name}`).join(' • '),
        total: finalTotal,
        rawItems: cart,
      };
      const existingHistory = JSON.parse(localStorage.getItem('pabee_order_history') || '[]');
      localStorage.setItem('pabee_order_history', JSON.stringify([completedOrder, ...existingHistory].slice(0, 5)));

      // Bind Active Order Tokens for Tracking
      localStorage.setItem('activeOrderId', data.id);
      localStorage.setItem('activeOrderToken', data.tokenNumber);
      localStorage.setItem('activeOrderStatus', 'pending');

      clearCart();
      toast.success(`Order #${data.tokenNumber} placed successfully!`);
      onBack();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Network error while placing order');
      setIsSubmitting(false);
      return false;
    }
  };

  // Master Checkout Trigger
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!customerName.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter your name and a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);

    const hasStock = await checkLiveStock();
    if (!hasStock) {
      setIsSubmitting(false);
      return;
    }

    if (paymentMode === 'RAZORPAY') {
      try {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) throw new Error('Razorpay failed to load');

        const orderRes = await fetch(`${API_URL}/api/checkout/razorpay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, amount: finalTotal }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || orderData.error) throw new Error(orderData.error || 'Failed to start payment');

        const options = {
          key: vendorPayment?.razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Food Order',
          description: `Order for ${customerName.trim()}`,
          order_id: orderData.id,
          handler: async function () {
            toast.success('Payment verified!');
            await saveFinalOrderToDatabase('RAZORPAY');
          },
          prefill: { contact: phone, name: customerName },
          theme: { color: '#E5B35C' },
          config: { display: { preferences: { show_default_blocks: true } } },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', () => {
          toast.error('Payment cancelled or rejected');
          setIsSubmitting(false);
        });
        rzp.open();
      } catch (err: any) {
        toast.error(err.message || 'Payment initiation failed');
        setIsSubmitting(false);
      }
    } else {
      await saveFinalOrderToDatabase(paymentMode);
    }
  };

  <div className="bg-red-600 text-white text-center font-bold py-2">
  🔥 ACTIVE FILE: SRC/COMPONENTS/CHECKOUT.TSX 🔥
</div>
  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#121110] text-[#1C1A17] dark:text-[#F5F0E8] pb-36 font-sans">
      <div className="max-w-xl mx-auto">
        
        {/* Prototype Top Bar (`topbar`) */}
        <div className="sticky top-0 z-20 bg-[#FFFBF5] dark:bg-[#121110] border-b border-[#E7DED0] dark:border-[#3A352E] px-4 py-2 flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl text-[#8A5A00] dark:text-[#E5B35C] active:scale-90 transition-transform"
            aria-label="Back to menu"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">Your order</h1>

          {/* Prototype Speech Listen Button */}
          <button
            onClick={handleListenOrder}
            className="ml-auto min-h-[36px] px-3.5 rounded-full border border-[#E7DED0] dark:border-[#3A352E] bg-white dark:bg-[#1C1A18] text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span>🔊</span>
            <span>Listen</span>
          </button>
        </div>

        {/* Prototype 3-Column Itemized Cart Lines (`cline`) */}
        <div className="divide-y divide-[#E7DED0] dark:divide-[#3A352E] bg-white dark:bg-[#1C1A18] border-b border-[#E7DED0] dark:border-[#3A352E]">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-[#7A7266] dark:text-[#9A9184]">
              Your cart is empty.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[16px_1fr_auto] gap-3 p-4 items-start"
              >
                {/* Official Veg / Non-Veg Mark */}
                <span
                  role="img"
                  aria-label={item.veg ? 'Veg' : 'Non-veg'}
                  className={`w-4 h-4 mt-1 border-[1.5px] rounded-[2px] inline-grid place-items-center shrink-0 ${
                    item.veg ? 'border-[#0F8A3C]' : 'border-[#7A3E12]'
                  }`}
                >
                  <span
                    className={`w-[7px] h-[7px] ${
                      item.veg ? 'rounded-full bg-[#0F8A3C]' : 'bg-[#7A3E12] [clip-path:polygon(50%_0,100%_100%,0_100%)]'
                    }`}
                  />
                </span>

                {/* Details */}
                <div className="min-w-0">
                  <div className="text-base font-semibold leading-tight truncate">{item.name}</div>
                  <div className="text-sm font-bold tabular-nums mt-1 text-[#1C1A17] dark:text-[#F5F0E8]">
                    ₹{item.price * item.qty}
                  </div>
                </div>

                {/* Overlapping Counter Stepper (`step`) */}
                <div className="w-24 h-9 rounded-lg bg-[#E5B35C] text-[#1A1206] flex items-center justify-between font-bold shadow-sm tabular-nums shrink-0">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-[34px] h-9 text-xl text-center active:scale-90"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-[34px] h-9 text-xl text-center active:scale-90"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Prototype Cross-Sell Carousel ("Often ordered with this") */}
        {crossSells.length > 0 && (
          <div className="mt-4">
            <div className="text-[15px] font-semibold px-4 mb-2 text-[#5C554B] dark:text-[#C7BFB2]">
              Often ordered with this
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 no-scrollbar">
              {crossSells.map((dish) => (
                <div
                  key={dish.id}
                  className="shrink-0 w-32 border border-[#E7DED0] dark:border-[#3A352E] rounded-xl bg-white dark:bg-[#1C1A18] p-2 flex flex-col justify-between shadow-sm"
                >
                  <div
                    style={{ backgroundColor: getTint(dish.id) }}
                    className="w-full h-16 rounded-lg grid place-items-center font-bold text-2xl text-[#5C554B]"
                  >
                    {(dish.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold leading-tight line-clamp-2 mt-1.5 min-h-[36px]">
                    {dish.name}
                  </div>
                  <div className="text-sm font-bold tabular-nums my-1">₹{dish.price}</div>
                  <button
                    onClick={() => addToCart(dish)}
                    className="w-full h-9 rounded-lg bg-[#1C1A17] dark:bg-[#F5F0E8] text-[#FFFBF5] dark:text-[#121110] font-semibold text-sm active:scale-95 transition-transform"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prototype Prep Time Badge (`box` + `eta`) */}
        <div className="mx-4 mt-4 p-4 rounded-xl bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] shadow-sm flex items-center gap-2 font-semibold text-[15px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>{packIt ? 'Parcel · ' : ''}Ready in about {prepEstimate} min</span>
        </div>

        {/* Prototype Bill Breakdown Box (`box` + `brow`) */}
        <div className="mx-4 mt-3 p-4 rounded-xl bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] shadow-sm space-y-1.5">
          <div className="flex justify-between text-[15px] tabular-nums">
            <span>Item total</span>
            <span>₹{itemTotal}</span>
          </div>

          {appliedPromoCode && (
            <div className="flex justify-between text-[15px] font-semibold text-[#146C31] dark:text-[#5CC97B] tabular-nums">
              <span className="flex items-center gap-1.5">
                ✓ Offer: {appliedPromoCode}
                <button onClick={handleRemovePromo} className="text-xs text-red-500 underline ml-1 font-normal">
                  Remove
                </button>
              </span>
              <span>−₹{discountAmount}</span>
            </div>
          )}

          {packIt && (
            <div className="flex justify-between text-[15px] tabular-nums">
              <span>Packing</span>
              <span>+₹10</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-[#7A7266] dark:text-[#9A9184] py-1">
            <span>Taxes included</span>
            <span></span>
          </div>

          <div className="flex justify-between items-center text-xl font-bold tabular-nums pt-2.5 border-t border-[#E7DED0] dark:border-[#3A352E]">
            <span>To pay</span>
            <span className="text-[#8A5A00] dark:text-[#E5B35C]">₹{finalTotal}</span>
          </div>

          {/* Prototype Expandable Promo Box */}
          <div className="pt-2">
            {!showCodeInput && !appliedPromoCode ? (
              <button
                onClick={() => setShowCodeInput(true)}
                className="text-sm font-semibold text-[#8A5A00] dark:text-[#E5B35C] hover:underline"
              >
                Have a code?
              </button>
            ) : !appliedPromoCode ? (
              <div className="space-y-2 mt-2">
                {availablePromos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {availablePromos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPromoCode(p.code);
                          handleApplyPromo(p.code);
                        }}
                        className="shrink-0 px-3 py-1 rounded-full border border-[#E7DED0] dark:border-[#3A352E] text-xs font-semibold bg-[#F6F0E6] dark:bg-[#26231F]"
                      >
                        ⚡ {p.code} ({p.type === 'FLAT' ? `₹${p.value}` : `${p.value}%`} off)
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 h-11 rounded-lg border border-[#E7DED0] dark:border-[#3A352E] bg-[#F6F0E6] dark:bg-[#26231F] px-3 text-sm uppercase outline-none focus:border-[#E5B35C]"
                  />
                  <button
                    onClick={() => handleApplyPromo()}
                    disabled={!promoCode.trim()}
                    className="px-4 h-11 rounded-lg bg-[#1C1A17] dark:bg-[#F5F0E8] text-[#FFFBF5] dark:text-[#121110] font-semibold text-sm disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Diner Details Box */}
        <div className="mx-4 mt-3 p-4 rounded-xl bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] shadow-sm space-y-3.5">
          {/* 1. Name Input (Strictly Required) */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Your Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tejas"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-12 rounded-lg border border-[#E7DED0] dark:border-[#3A352E] bg-[#F6F0E6] dark:bg-[#26231F] px-3.5 text-base outline-none focus:border-[#E5B35C]"
            />
          </div>

          {/* 2. Phone Input */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Mobile number (for order status) *
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 rounded-lg border border-[#E7DED0] dark:border-[#3A352E] bg-[#F6F0E6] dark:bg-[#26231F] px-3.5 text-base outline-none focus:border-[#E5B35C]"
            />
          </div>

          {/* 3. Note for the Cook */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Note for the cook
            </label>
            <input
              type="text"
              placeholder="e.g. less spicy, no onion, less oil"
              value={cookNote}
              onChange={(e) => setCookNote(e.target.value)}
              className="w-full h-12 rounded-lg border border-[#E7DED0] dark:border-[#3A352E] bg-[#F6F0E6] dark:bg-[#26231F] px-3.5 text-base outline-none focus:border-[#E5B35C]"
            />
            <div className="flex gap-2 flex-wrap mt-2">
              {['Less spicy', 'No onion', 'Less oil', 'Jain'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setCookNote((prev) =>
                      prev.includes(tag) ? prev : prev ? `${prev}, ${tag}` : tag
                    )
                  }
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border border-[#E7DED0] dark:border-[#3A352E] bg-[#F6F0E6] dark:bg-[#26231F] active:scale-95"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Takeaway Checkbox */}
          <button
            type="button"
            onClick={() => setPackIt(!packIt)}
            className="flex items-center gap-3 w-full text-left text-[15px] font-semibold pt-2 border-t border-[#E7DED0] dark:border-[#3A352E]"
          >
            <span
              className={`w-[22px] h-[22px] rounded-md border-2 border-[#7A7266] flex items-center justify-center font-bold text-xs shrink-0 ${
                packIt
                  ? 'bg-[#1C1A17] dark:bg-[#F5F0E8] border-transparent text-[#FFFBF5] dark:text-[#121110]'
                  : 'text-transparent'
              }`}
            >
              ✓
            </span>
            <span>Pack it to take away (+₹10 packing)[cite: 2]</span>
          </button>
        </div>

        {/* Prototype Payment Method Radios (`pc`) */}
        <div className="mx-4 mt-3 p-4 rounded-xl bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] shadow-sm space-y-2.5">
          <div className="text-[15px] font-semibold text-[#5C554B] dark:text-[#C7BFB2] mb-1">
            Pay by
          </div>

          {/* Option 1: Razorpay Gateway */}
          {vendorPayment?.available && vendorPayment?.paymentType === 'RAZORPAY' && (
            <button
              type="button"
              onClick={() => setPaymentMode('RAZORPAY')}
              className={`w-full min-h-[64px] rounded-xl p-3.5 flex items-center gap-3.5 text-left border transition-all ${
                paymentMode === 'RAZORPAY'
                  ? 'border-2 border-[#1C1A17] dark:border-[#F5F0E8] bg-[#F6F0E6] dark:bg-[#26231F]'
                  : 'border border-[#E7DED0] dark:border-[#3A352E]'
              }`}
            >
              <span
                className={`w-[22px] h-[22px] rounded-full border-2 border-[#7A7266] shrink-0 transition-all ${
                  paymentMode === 'RAZORPAY' ? 'border-[7px] border-[#1C1A17] dark:border-[#F5F0E8]' : ''
                }`}
              />
              <div>
                <b className="text-base block">UPI</b>
                <span className="text-xs text-[#7A7266] dark:text-[#9A9184] block">
                  GPay, PhonePe, Paytm or any UPI app
                </span>
              </div>
            </button>
          )}

          {/* Option 2: Direct Counter UPI */}
          {vendorPayment?.available && vendorPayment?.paymentType === 'UPI' && (
            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              className={`w-full min-h-[64px] rounded-xl p-3.5 flex items-center gap-3.5 text-left border transition-all ${
                paymentMode === 'UPI'
                  ? 'border-2 border-[#1C1A17] dark:border-[#F5F0E8] bg-[#F6F0E6] dark:bg-[#26231F]'
                  : 'border border-[#E7DED0] dark:border-[#3A352E]'
              }`}
            >
              <span
                className={`w-[22px] h-[22px] rounded-full border-2 border-[#7A7266] shrink-0 transition-all ${
                  paymentMode === 'UPI' ? 'border-[7px] border-[#1C1A17] dark:border-[#F5F0E8]' : ''
                }`}
              />
              <div>
                <b className="text-base block">UPI</b>
                <span className="text-xs text-[#7A7266] dark:text-[#9A9184] block">
                  Scan QR or pay {vendorPayment.upiId}
                </span>
              </div>
            </button>
          )}

          {/* Option 3: Counter Cash */}
          <button
            type="button"
            onClick={() => setPaymentMode('CASH')}
            className={`w-full min-h-[64px] rounded-xl p-3.5 flex items-center gap-3.5 text-left border transition-all ${
              paymentMode === 'CASH'
                ? 'border-2 border-[#1C1A17] dark:border-[#F5F0E8] bg-[#F6F0E6] dark:bg-[#26231F]'
                : 'border border-[#E7DED0] dark:border-[#3A352E]'
            }`}
          >
            <span
              className={`w-[22px] h-[22px] rounded-full border-2 border-[#7A7266] shrink-0 transition-all ${
                paymentMode === 'CASH' ? 'border-[7px] border-[#1C1A17] dark:border-[#F5F0E8]' : ''
              }`}
            />
            <div>
              <b className="text-base block">Cash at counter</b>
              <span className="text-xs text-[#7A7266] dark:text-[#9A9184] block">
                Pay when you collect
              </span>
            </div>
          </button>
        </div>

        {/* Prototype Sticky Bottom Action Bar (`bottom`) */}
        <div className="fixed left-0 right-0 bottom-0 bg-[#FFFBF5] dark:bg-[#121110] border-t border-[#E7DED0] dark:border-[#3A352E] px-4 pt-2.5 pb-5 z-30 max-w-xl mx-auto">
          {discountAmount > 0 && (
            <div className="h-9 rounded-lg bg-[#E7F4EA] dark:bg-[#15291B] text-[#146C31] dark:text-[#5CC97B] font-semibold text-xs flex items-center justify-center gap-1.5 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span>You save ₹{discountAmount} on this order</span>
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-[52px] rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-[17px] text-center active:scale-[0.97] transition-transform disabled:opacity-40 disabled:pointer-events-none tabular-nums shadow-sm"
          >
            {isSubmitting
              ? 'Checking with kitchen…'
              : paymentMode === 'RAZORPAY' || paymentMode === 'UPI'
                ? `Pay ₹${finalTotal} by UPI`
                : `Place order · pay ₹${finalTotal} at counter`}
          </button>
        </div>
      </div>
    </div>
  );
}