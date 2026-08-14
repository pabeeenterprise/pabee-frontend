import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

// 🌟 Tell TypeScript that the Razorpay script will be injected into the browser window
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout({ vendorId, tableId, onBack }: { vendorId: string; tableId: string; onBack: () => void }) {
  const { cart, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [paymentMode, setPaymentMode] = useState('UPI'); 
  const [promoCode, setPromoCode] = useState('');
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 NEW: Expanded payment data type
  const [vendorPayment, setVendorPayment] = useState<{available: boolean, paymentType?: string, upiId?: string, qrImagePath?: string, razorpayKeyId?: string} | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
  const subtotal = cart.reduce((sum, cartItem) => sum + (cartItem.price * cartItem.qty), 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // 🧠 FETCH ACTIVE OFFERS FOR DROPDOWN
  useEffect(() => {
    const fetchAvailablePromos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/promos`);
        
        if (res.ok) {
          const data = await res.json();
          // Automatically filter out offers that are toggled off or expired
          const validPromos = data.promos.filter((p: any) => {
            const isNotExpired = !p.expiresAt || new Date(p.expiresAt) >= new Date();
            return p.isActive && isNotExpired;
          });
          setAvailablePromos(validPromos);
        }
      } catch (err) {
        console.error("Failed to load promos", err);
      }
    };

    if (vendorId) fetchAvailablePromos();
  }, [vendorId]);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/payment/public`);
        if (res.ok) {
          const data = await res.json();
          setVendorPayment(data);
          
          // Auto-select the correct dropdown based on database config
          if (!data.available) setPaymentMode('CASH');
          else if (data.paymentType === 'RAZORPAY') setPaymentMode('RAZORPAY');
          else setPaymentMode('UPI');
        }
      } catch (error) {
        console.error("Could not load vendor payment data");
      }
    };
    if (vendorId) fetchPaymentData();
  }, [vendorId, API_URL]);


  const handleApplyPromo = async () => {
    if (!promoCode) return;
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/promos/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, cartItems: cart })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountAmount(data.discountAmount);
        setIsPromoApplied(true);
        toast.success(`Promo applied! You saved ₹${data.discountAmount}`);
      } else {
        toast.error(data.error || "Invalid promo code");
      }
    } catch (err) {
      toast.error("Failed to verify promo");
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || phone.length < 10) {
      toast.error("Please enter your Name and a valid 10-digit Phone Number");
      return;
    }
    setStep('payment');
  };

  // 🌟 NEW: Dynamically inject the Razorpay SDK into the browser
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 🌟 NEW: The function that saves the food order to Prisma AFTER payment succeeds
  // 🌟 UPDATE: saveFinalOrderToDatabase
  const saveFinalOrderToDatabase = async (finalPaymentMode: string) => {
    try {
      const orderPayload = {
        vendorId,
        tableId: tableId,
        customerName: customerName.trim(),
        customerPhone: phone,
        paymentMode: finalPaymentMode,
        total: finalTotal,
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price }))
      };

      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (orderRes.ok) {
        // 👇 CRITICAL NEW LOGIC: Capture the ID and Token
        const orderData = await orderRes.json();
        const completedOrder = {
          id: orderData.id,
          date: new Date().toISOString(),
          summary: cart.map(c => `${c.qty}x ${c.name}`).join(' • '), 
          total: finalTotal,
          rawItems: cart 
        };
        const existingHistory = JSON.parse(localStorage.getItem('pabee_order_history') || '[]');
        localStorage.setItem('pabee_order_history', JSON.stringify([completedOrder, ...existingHistory].slice(0, 3)));
        
        // 🧠 TRACKING TOKENS & REFRESH STATUS
        localStorage.setItem('activeOrderId', orderData.id);
        localStorage.setItem('activeOrderToken', orderData.tokenNumber);
        localStorage.setItem('activeOrderStatus', 'pending'); 

        clearCart();
        onBack(); // 🚀 THIS INSTANTLY ROUTES THEM TO THE MENU
      } else {
        throw new Error("Failed to create order");
      }
    } catch (err) {
      toast.error("Error placing order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 NEW: The Master Checkout Handler
  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    
    // PATH 1: RAZORPAY GATEWAY
    if (paymentMode === 'RAZORPAY') {
      try {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) throw new Error("Razorpay failed to load. Check your connection.");

        // Ask Backend to Create an Order
        const orderRes = await fetch(`${API_URL}/api/checkout/razorpay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, amount: finalTotal })
        });
        const orderData = await orderRes.json();
        
        if (orderData.error) throw new Error(orderData.error);

        // Open the Razorpay Modal
        const options = {
          key: vendorPayment?.razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Your Order",
          description: `Order for ${customerName}`,          
          order_id: orderData.id,
          handler: async function () {
            toast.success("Payment successful!");
            await saveFinalOrderToDatabase('RAZORPAY');
          },
          prefill: { 
            contact: phone,
            name: customerName,
            method: 'upi' // 🚀 THIS SKIPS THE SELECTION SCREEN
          },
          theme: { color: "#E5B35C" },
          
          // Keep the safety 'hide' array just in case the customer hits 'Back' inside the modal
          config: {
            display: {
              hide: [
                { method: 'card' },
                { method: 'netbanking' },
                { method: 'wallet' },
                { method: 'emi' },
                { method: 'paylater' }
              ],
              preferences: {
                show_default_blocks: true 
              }
            }
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function () {
          toast.error("Payment failed or cancelled.");
          setIsSubmitting(false);
        });
        paymentObject.open();

      } catch (err: any) {
        toast.error(err.message || "Checkout failed");
        setIsSubmitting(false);
      }
    } 
    // PATH 2: STATIC UPI OR CASH
    else {
      await saveFinalOrderToDatabase(paymentMode);
    }
  };

  // --- CHECKOUT UI ---
  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-200 font-sans pb-24">
      <div className="sticky top-0 bg-[#13161F] border-b border-[#1F2330] p-4 flex items-center gap-4 z-10">
        <button onClick={step === 'payment' ? () => setStep('details') : onBack} className="text-[#E5B35C] font-bold text-xl">←</button>
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-5 mb-6 shadow-md">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {cart.map((cartItem, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div><span className="font-bold text-white">{cartItem.qty}x</span> {cartItem.name}</div>
                <div className="text-gray-400">₹{cartItem.price * cartItem.qty}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#1F2330] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>₹{subtotal}</span></div>
            {isPromoApplied && <div className="flex justify-between text-green-400 font-bold"><span>Discount</span><span>- ₹{discountAmount}</span></div>}
            <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-[#1F2330] mt-2">
              <span>Total</span><span className="text-[#E5B35C]">₹{finalTotal}</span>
            </div>
          </div>
        </div>

        {step === 'details' && !isPromoApplied && (
          <div className="flex gap-2 mb-6">
            {/* 🏷️ DYNAMIC PROMO DROPDOWN */}
            <select 
              value={promoCode} 
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-[#13161F] border border-[#1F2330] rounded-xl p-3 text-white text-sm focus:border-[#E5B35C] outline-none cursor-pointer appearance-none"
            >
              <option value="">Select an available offer...</option>
              {availablePromos.map(promo => (
                <option key={promo.id} value={promo.code}>
                  {promo.code} — {promo.type === 'FLAT' ? `₹${promo.value}` : `${promo.value}%`} OFF (Min ₹{promo.minOrderValue})
                </option>
              ))}
            </select>
            
            <button 
              onClick={handleApplyPromo} 
              disabled={!promoCode}
              className="bg-[#1F2330] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Apply
            </button>
          </div>
        )}

        <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            {step === 'payment' ? 'Complete Order' : 'Your Details'}
          </h2>
          
          {step === 'details' ? (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Your Name *</label>
                <input type="text" required placeholder="e.g. Tejas" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
                <input type="tel" required placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]">
                  {vendorPayment?.available && vendorPayment?.paymentType === 'RAZORPAY' && <option value="RAZORPAY">Pay securely with Razorpay</option>}
                  {vendorPayment?.available && vendorPayment?.paymentType === 'UPI' && <option value="UPI">Pay via UPI / QR</option>}
                  <option value="CASH">Pay Cash at Counter</option>
                </select>
              </div>
              <button type="submit" className="w-full mt-4 bg-[#E5B35C] text-[#0B0E14] font-bold py-3.5 rounded-xl transition-opacity hover:bg-[#d4a24b]">Continue</button>
            </form>
          ) : (
            <div className="space-y-4">
              
              {/* RAZORPAY PATH */}
              {paymentMode === 'RAZORPAY' && (
                <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-5 text-center mb-6 shadow-lg">
                  <h3 className="text-[#E5B35C] font-serif text-xl mb-4">Amount Due: ₹{finalTotal}</h3>
                  <p className="text-sm text-gray-400 mb-4">You will be redirected to the secure payment gateway.</p>
                </div>
              )}

              {/* STATIC UPI PATH */}
              {paymentMode === 'UPI' && vendorPayment?.available && (
                <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-5 text-center mb-6 shadow-lg">
                  <h3 className="text-[#E5B35C] font-serif text-xl mb-4">Amount Due: ₹{finalTotal}</h3>
                  <a href={`upi://pay?pa=${vendorPayment.upiId}&pn=Restaurant%20Order&am=${finalTotal}&cu=INR`} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-blue-700 transition-colors mb-6 flex items-center justify-center gap-2">
                    <span>⚡</span> Open UPI App to Pay
                  </a>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-gray-800"></div><span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Or Scan</span><div className="flex-1 h-px bg-gray-800"></div>
                  </div>
                  {vendorPayment.qrImagePath ? (
                    <img src={vendorPayment.qrImagePath} alt="Vendor QR Code" className="w-40 h-40 mx-auto rounded-lg mb-3 object-contain bg-white p-2" />
                  ) : (
                    <div className="w-40 h-40 mx-auto border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-xs mb-3">No QR</div>
                  )}
                  <p className="text-xs text-gray-400 mb-1">UPI ID: <span className="text-white font-mono">{vendorPayment.upiId}</span></p>
                  <p className="text-[10px] text-red-400 mt-3 font-bold uppercase">⚠️ Do not close this page until payment is sent!</p>
                </div>
              )}

              {/* CASH PATH */}
              {paymentMode === 'CASH' && (
                <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-6 text-center mb-6">
                  <span className="text-4xl mb-4 block">💵</span>
                  <h3 className="text-white font-bold text-lg mb-2">Pay ₹{finalTotal} at Counter</h3>
                  <p className="text-sm text-gray-400">Your order will be sent to the kitchen immediately. Please have exact change ready.</p>
                </div>
              )}

              <button onClick={handlePlaceOrder} disabled={isSubmitting} className="w-full bg-[#E5B35C] text-[#0B0E14] font-bold py-3.5 rounded-xl transition-opacity disabled:opacity-50">
                {isSubmitting ? 'Processing...' : paymentMode === 'RAZORPAY' ? 'Pay Now' : paymentMode === 'UPI' ? 'I Have Paid & Verify Order' : 'Place Order Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}