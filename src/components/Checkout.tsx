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
  const [localTableId, setLocalTableId] = useState(tableId);
  const [phone, setPhone] = useState('');
  
  const [paymentMode, setPaymentMode] = useState('UPI'); 
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // 🌟 NEW: Expanded payment data type
  const [vendorPayment, setVendorPayment] = useState<{available: boolean, paymentType?: string, upiId?: string, qrImagePath?: string, razorpayKeyId?: string} | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
  const subtotal = cart.reduce((sum, cartItem) => sum + (cartItem.price * cartItem.qty), 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

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
    if (!localTableId || phone.length < 10) {
      toast.error("Please enter a valid Table Number and 10-digit Phone Number");
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
  const saveFinalOrderToDatabase = async (finalPaymentMode: string) => {
    try {
      const orderPayload = {
        vendorId,
        tableId: localTableId,
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
        setOrderComplete(true);
        clearCart();
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
          key: vendorPayment?.razorpayKeyId, // The public key from our patch
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Your Order",
          description: `Table ${localTableId}`,
          order_id: orderData.id,
          handler: async function () {
            // SUCCESS! They paid. Now save the food order.
            toast.success("Payment successful!");
            await saveFinalOrderToDatabase('RAZORPAY');
          },
          prefill: { contact: phone },
          theme: { color: "#E5B35C" }
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

  // --- SUCCESS SCREEN ---
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
        <h2 className="text-3xl font-bold text-white mb-2">Order Sent!</h2>
        
        {paymentMode === 'UPI' ? (
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl mb-8 max-w-sm">
            <p className="text-blue-400 font-bold mb-1">Action Required:</p>
            <p className="text-gray-300 text-sm">Please show your green UPI success screen to the counter staff.</p>
          </div>
        ) : paymentMode === 'CASH' ? (
          <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl mb-8 max-w-sm">
            <p className="text-yellow-400 font-bold mb-1">Pay at Counter</p>
            <p className="text-gray-300 text-sm">Please pay ₹{finalTotal} in cash at the counter.</p>
          </div>
        ) : (
          <div className="bg-[#E5B35C]/20 border border-[#E5B35C]/30 p-4 rounded-xl mb-8 max-w-sm">
            <p className="text-[#E5B35C] font-bold mb-1">Payment Verified</p>
            <p className="text-gray-300 text-sm">Your digital payment was successful and the kitchen is preparing your food.</p>
          </div>
        )}

        <button onClick={onBack} className="bg-[#E5B35C] text-[#0B0E14] font-bold py-3 px-8 rounded-xl shadow-lg">Return to Menu</button>
      </div>
    );
  }

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
            <input type="text" placeholder="Have a promo code?" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} className="flex-1 bg-[#13161F] border border-[#1F2330] rounded-xl p-3 text-white text-sm focus:border-[#E5B35C] outline-none uppercase" />
            <button onClick={handleApplyPromo} className="bg-[#1F2330] text-white px-4 rounded-xl font-bold text-sm hover:bg-gray-700">Apply</button>
          </div>
        )}

        <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            {step === 'payment' ? 'Complete Order' : 'Your Details'}
          </h2>
          
          {step === 'details' ? (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Table Number</label>
                <input type="text" required placeholder="e.g. Table 4" value={localTableId} onChange={(e) => setLocalTableId(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]" />
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