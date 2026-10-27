import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Promo {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderValue: number;
  applyTo?: string;
  expiresAt?: string | null;
  isActive: boolean;
}

interface VendorPaymentConfig {
  available: boolean;
  paymentType?: 'UPI' | 'RAZORPAY';
  upiId?: string;
  qrImagePath?: string;
  razorpayKeyId?: string;
}

export default function Checkout({
  vendorId,
  tableId,
  onBack,
}: {
  vendorId: string;
  tableId: string;
  onBack: () => void;
}) {
  const { cart, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

  const [paymentMode, setPaymentMode] = useState<'RAZORPAY' | 'UPI' | 'CASH'>('CASH');
  const [promoCode, setPromoCode] = useState('');
  const [availablePromos, setAvailablePromos] = useState<Promo[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vendorPayment, setVendorPayment] = useState<VendorPaymentConfig | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // 1. Fetch active promos
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

  // 2. Fetch payment config & set default method
  useEffect(() => {
    const fetchPayment = async () => {
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
        console.error('Failed to load payment configuration', err);
      }
    };
    if (vendorId) fetchPayment();
  }, [vendorId, API_URL]);

  // 3. Apply Promo Code
  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoCode).trim().toUpperCase();
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
        toast.success(`Code ${code} applied! Saved ₹${data.discountAmount}`);
      } else {
        toast.error(data.error || 'Invalid promo code');
      }
    } catch (err) {
      toast.error('Failed to verify promo code');
    }
  };

  const handleRemovePromo = () => {
    setDiscountAmount(0);
    setAppliedPromoCode(null);
    setPromoCode('');
    toast('Promo removed', { icon: 'ℹ️' });
  };

  // 4. Inject Razorpay Checkout Script
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

  // 5. Pre-validate stock before opening payment modal
  const checkStockAvailability = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu`);
      if (!res.ok) return true; // Proceed if menu check is unreachable
      const data = await res.json();
      const currentMenu: any[] = data.items || [];

      for (const cartItem of cart) {
        const dish = currentMenu.find((m) => m.name.toLowerCase() === cartItem.name.toLowerCase());
        if (dish && dish.available === false) {
          toast.error(`"${cartItem.name}" just ran out of stock. Please remove it from your cart.`, {
            duration: 6000,
          });
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  };

  // 6. Master Order Submission to Prisma
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

      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();

      // 🚨 CRITICAL: Catch specific stock depletion errors from backend
      if (!orderRes.ok) {
        toast.error(orderData.error || 'Order failed. Please check item availability.', {
          duration: 7000,
        });
        setIsSubmitting(false);
        return false;
      }

      // Record Order in Local History ("Order It Again")
      const completedOrder = {
        id: orderData.id,
        vendorId,
        date: new Date().toISOString(),
        summary: cart.map((c) => `${c.qty}x ${c.name}`).join(' • '),
        total: finalTotal,
        rawItems: cart,
      };
      const existingHistory = JSON.parse(localStorage.getItem('pabee_order_history') || '[]');
      localStorage.setItem(
        'pabee_order_history',
        JSON.stringify([completedOrder, ...existingHistory].slice(0, 5))
      );

      // Set active order tracker tokens
      localStorage.setItem('activeOrderId', orderData.id);
      localStorage.setItem('activeOrderToken', orderData.tokenNumber);
      localStorage.setItem('activeOrderStatus', 'pending');

      clearCart();
      toast.success(`Order #${orderData.tokenNumber} placed successfully!`);
      onBack(); // Route immediately to the menu to show live tracker
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Error placing order. Please try again.');
      setIsSubmitting(false);
      return false;
    }
  };

  // 7. Master Checkout Trigger
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!customerName.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter your name and a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);

    // Guard: Check live stock before charging money
    const hasStock = await checkStockAvailability();
    if (!hasStock) {
      setIsSubmitting(false);
      return;
    }

    // PATH 1: RAZORPAY GATEWAY
    if (paymentMode === 'RAZORPAY') {
      try {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) throw new Error('Razorpay gateway failed to load. Check your connection.');

        const orderRes = await fetch(`${API_URL}/api/checkout/razorpay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, amount: finalTotal }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || orderData.error) throw new Error(orderData.error || 'Failed to initialize payment');

        const options = {
          key: vendorPayment?.razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Your Food Order',
          description: `Token order for ${customerName.trim()}`,
          order_id: orderData.id,
          handler: async function () {
            toast.success('Payment confirmed!');
            await saveFinalOrderToDatabase('RAZORPAY');
          },
          prefill: {
            contact: phone,
            name: customerName,
          },
          theme: { color: '#E5B35C' },
          config: {
            display: {
              preferences: {
                show_default_blocks: true,
              },
            },
          },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function () {
          toast.error('Payment cancelled or rejected by bank.');
          setIsSubmitting(false);
        });
        paymentObject.open();
      } catch (err: any) {
        toast.error(err.message || 'Checkout failed');
        setIsSubmitting(false);
      }
    }
    // PATH 2: STATIC UPI OR COUNTER CASH
    else {
      await saveFinalOrderToDatabase(paymentMode);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#121110] text-[#1C1A17] dark:text-[#F5F0E8] pb-36 font-sans transition-colors">
      <div className="max-w-xl mx-auto">
        
        {/* Sticky Top Bar (`topbar`) */}
        <div className="sticky top-0 z-20 bg-[#FFFBF5] dark:bg-[#121110] border-b border-[#E7DED0] dark:border-[#3A352E] px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl text-[#8A5A00] dark:text-[#E5B35C] active:scale-90 transition-transform"
            aria-label="Back to menu"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">Your Order</h1>
        </div>

        <div className="p-4 space-y-4">
          
          {/* 1. Itemized Cart Breakdown (`cline`) */}
          <div className="bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] rounded-2xl overflow-hidden divide-y divide-[#E7DED0] dark:divide-[#3A352E] shadow-sm">
            {cart.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    role="img"
                    aria-label={item.veg ? 'Veg' : 'Non-veg'}
                    className={`w-4 h-4 border-[1.5px] rounded-[2px] inline-grid place-items-center shrink-0 ${
                      item.veg ? 'border-[#0F8A3C]' : 'border-[#7A3E12]'
                    }`}
                  >
                    <span
                      className={`w-[7px] h-[7px] ${
                        item.veg ? 'rounded-full bg-[#0F8A3C]' : 'bg-[#7A3E12] [clip-path:polygon(50%_0,100%_100%,0_100%)]'
                      }`}
                    />
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-base truncate">{item.name}</div>
                    <div className="text-xs text-[#7A7266] dark:text-[#9A9184]">
                      ₹{item.price} each
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-base tabular-nums">
                    {item.qty} × ₹{item.price} = ₹{item.price * item.qty}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 2. Prototype Bill Breakdown (`box` & `brow`) */}
          <div className="bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="flex justify-between text-sm text-[#5C554B] dark:text-[#C7BFB2] tabular-nums">
              <span>Item total</span>
              <span>₹{subtotal}</span>
            </div>

            {appliedPromoCode && (
              <div className="flex justify-between text-sm font-semibold text-[#146C31] dark:text-[#5CC97B] tabular-nums">
                <span className="flex items-center gap-1.5">
                  ✓ Offer: {appliedPromoCode}
                  <button onClick={handleRemovePromo} className="text-xs underline text-red-500 font-normal ml-1">
                    Remove
                  </button>
                </span>
                <span>−₹{discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-[#7A7266] dark:text-[#9A9184]">
              <span>Taxes included</span>
              <span>₹0</span>
            </div>

            <div className="border-t border-[#E7DED0] dark:border-[#3A352E] pt-3 flex justify-between items-center text-lg font-bold tabular-nums">
              <span>To pay</span>
              <span className="text-xl text-[#8A5A00] dark:text-[#E5B35C]">₹{finalTotal}</span>
            </div>
          </div>

          {/* 3. Promo Code Section */}
          <div className="bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] rounded-2xl p-4 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7266] dark:text-[#9A9184]">
              Have a Promo Code?
            </label>

            {availablePromos.length > 0 && !appliedPromoCode && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {availablePromos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPromoCode(p.code);
                      handleApplyPromo(p.code);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-[#E7DED0] dark:border-[#3A352E] text-xs font-semibold bg-[#F6F0E6] dark:bg-[#26231F] hover:border-[#E5B35C] transition-colors"
                  >
                    ⚡ {p.code} ({p.type === 'FLAT' ? `₹${p.value}` : `${p.value}%`} OFF)
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={!!appliedPromoCode}
                className="flex-1 h-12 rounded-xl bg-[#F6F0E6] dark:bg-[#26231F] border border-[#E7DED0] dark:border-[#3A352E] px-3.5 text-sm font-semibold uppercase outline-none focus:border-[#E5B35C] disabled:opacity-60"
              />
              {appliedPromoCode ? (
                <button
                  onClick={handleRemovePromo}
                  className="px-4 h-12 rounded-xl border border-red-500/40 text-red-500 font-semibold text-sm"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => handleApplyPromo()}
                  disabled={!promoCode.trim()}
                  className="px-5 h-12 rounded-xl bg-[#1C1A17] dark:bg-[#F5F0E8] text-[#FFFBF5] dark:text-[#121110] font-semibold text-sm disabled:opacity-40"
                >
                  Apply
                </button>
              )}
            </div>
          </div>

          {/* 4. Customer Contact Details (`box`) */}
          <div className="bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] rounded-2xl p-4 shadow-sm space-y-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A7266] dark:text-[#9A9184]">
              Customer Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#5C554B] dark:text-[#C7BFB2] mb-1">
                Name (to call when ready) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tejas"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-12 rounded-xl bg-[#F6F0E6] dark:bg-[#26231F] border border-[#E7DED0] dark:border-[#3A352E] px-3.5 text-base outline-none focus:border-[#E5B35C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C554B] dark:text-[#C7BFB2] mb-1">
                WhatsApp / Phone Number (for order updates) *
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-12 rounded-xl bg-[#F6F0E6] dark:bg-[#26231F] border border-[#E7DED0] dark:border-[#3A352E] px-3.5 text-base outline-none focus:border-[#E5B35C]"
              />
            </div>
          </div>

          {/* 5. Prototype Payment Selection Radios (`pc`) */}
          <div className="bg-white dark:bg-[#1C1A18] border border-[#E7DED0] dark:border-[#3A352E] rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A7266] dark:text-[#9A9184]">
              Payment Method
            </h2>

            {/* Option A: Razorpay */}
            {vendorPayment?.available && vendorPayment?.paymentType === 'RAZORPAY' && (
              <button
                type="button"
                onClick={() => setPaymentMode('RAZORPAY')}
                className={`w-full min-h-[64px] rounded-xl p-3.5 flex items-center gap-3.5 text-left border transition-all ${
                  paymentMode === 'RAZORPAY'
                    ? 'border-[#1C1A17] dark:border-[#F5F0E8] bg-[#F6F0E6] dark:bg-[#26231F]'
                    : 'border-[#E7DED0] dark:border-[#3A352E] bg-transparent'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentMode === 'RAZORPAY'
                      ? 'border-[#1C1A17] dark:border-[#F5F0E8]'
                      : 'border-[#7A7266]'
                  }`}
                >
                  {paymentMode === 'RAZORPAY' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1C1A17] dark:bg-[#F5F0E8]" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="font-bold text-base">Pay with Razorpay / UPI</div>
                  <div className="text-xs text-[#7A7266] dark:text-[#9A9184]">
                    Instant UPI, Cards, Netbanking
                  </div>
                </div>
              </button>
            )}

            {/* Option B: Direct UPI Intent / QR */}
            {vendorPayment?.available && vendorPayment?.paymentType === 'UPI' && (
              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`w-full min-h-[64px] rounded-xl p-3.5 flex items-center gap-3.5 text-left border transition-all ${
                  paymentMode === 'UPI'
                    ? 'border-[#1C1A17] dark:border-[#F5F0E8] bg-[#F6F0E6] dark:bg-[#26231F]'
                    : 'border-[#E7DED0] dark:border-[#3A352E] bg-transparent'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentMode === 'UPI'
                      ? 'border-[#1C1A17] dark:border-[#F5F0E8]'
                      : 'border-[#7A7266]'
                  }`}
                >
                  {paymentMode === 'UPI' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1C1A17] dark:bg-[#F5F0E8]" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="font-bold text-base">Pay via Counter UPI / QR</div>
                  <div className="text-xs text-[#7A7266] dark:text-[#9A9184]">
                    Scan QR or pay using UPI ID: {vendorPayment.upiId}
                  </div>
                </div>
              </button>
            )}

            {/* Option C: Cash at Counter */}
            <button
              type="button"
              onClick={() => setPaymentMode('CASH')}
              className={`w-full min-h-[64px] rounded-xl p-3.5 flex items-center gap-3.5 text-left border transition-all ${
                paymentMode === 'CASH'
                  ? 'border-[#1C1A17] dark:border-[#F5F0E8] bg-[#F6F0E6] dark:bg-[#26231F]'
                  : 'border-[#E7DED0] dark:border-[#3A352E] bg-transparent'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMode === 'CASH'
                    ? 'border-[#1C1A17] dark:border-[#F5F0E8]'
                    : 'border-[#7A7266]'
                }`}
              >
                {paymentMode === 'CASH' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1C1A17] dark:bg-[#F5F0E8]" />
                )}
              </span>
              <div className="flex-1">
                <div className="font-bold text-base">Pay Cash at Counter</div>
                <div className="text-xs text-[#7A7266] dark:text-[#9A9184]">
                  Pay when you collect your token
                </div>
              </div>
            </button>
          </div>

          {/* Static UPI Deep-Link Panel (Shows if UPI is selected) */}
          {paymentMode === 'UPI' && vendorPayment?.upiId && (
            <div className="bg-[#FFF4DB] dark:bg-[#2E2410] text-[#9A5B00] dark:text-[#F2B33D] rounded-2xl p-4 text-center border border-amber-500/20 space-y-3">
              <div className="text-sm font-semibold">
                Transfer ₹{finalTotal} to:
              </div>
              <div className="font-mono font-bold text-base bg-white/60 dark:bg-black/30 py-2 px-3 rounded-lg inline-block">
                {vendorPayment.upiId}
              </div>
              <a
                href={`upi://pay?pa=${vendorPayment.upiId}&pn=StoreOrder&am=${finalTotal}&cu=INR`}
                className="w-full h-11 rounded-xl bg-[#1C1A17] dark:bg-[#F5F0E8] text-[#FFFBF5] dark:text-[#121110] font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>⚡</span> Open Any UPI App to Pay
              </a>
              <p className="text-[11px] opacity-80">
                After paying, tap &quot;I Have Paid &amp; Place Order&quot; below.
              </p>
            </div>
          )}
        </div>

        {/* 6. Sticky Bottom Action Bar (`bottom`) */}
        <div className="fixed left-0 right-0 bottom-0 bg-[#FFFBF5] dark:bg-[#121110] border-t border-[#E7DED0] dark:border-[#3A352E] px-4 pt-3 pb-6 z-30 max-w-xl mx-auto">
          {discountAmount > 0 && (
            <div className="mb-2.5 h-9 rounded-lg bg-[#E7F4EA] dark:bg-[#15291B] text-[#146C31] dark:text-[#5CC97B] font-semibold text-xs flex items-center justify-center gap-1.5">
              <span>✓</span>
              <span>You save ₹{discountAmount} on this order</span>
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-14 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-base flex items-center justify-between px-5 shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none tabular-nums"
          >
            <span>
              {isSubmitting
                ? 'Validating Order…'
                : paymentMode === 'RAZORPAY'
                ? `Pay ₹${finalTotal} by UPI / Card`
                : paymentMode === 'UPI'
                ? `I Have Paid ₹${finalTotal} · Place Order`
                : `Place Order · Pay ₹${finalTotal} at Counter`}
            </span>
            <span className="text-xl">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}