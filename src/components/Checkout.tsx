import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';

export default function Checkout({ vendorId, onBack }: { vendorId: string, onBack: () => void }) {
  const { cart, clearCart } = useCart();
  
  // Basic Info
  const [tableId, setTableId] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  
  // Promo State
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  
  // OTP & Submission State
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // 💳 New Vendor Payment Data State
  const [vendorPayment, setVendorPayment] = useState<{available: boolean, upiId?: string, qrImagePath?: string} | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend.onrender.com';
  
  const subtotal = cart.reduce((sum, cartItem) => sum + (cartItem.price * cartItem.qty), 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // 1. Fetch Vendor's Public QR Code on Load
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/payment/public`);
        if (res.ok) {
          const data = await res.json();
          setVendorPayment(data);
          // If UPI is completely unavailable for this vendor, force cash
          if (!data.available) setPaymentMode('CASH');
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
        body: JSON.stringify({ code: promoCode, cartTotal: subtotal })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setDiscountAmount(data.discountAmount);
        setIsPromoApplied(true);
        toast.success(`Promo applied! You saved ₹${data.discountAmount}`);
      } else {
        toast.error(data.error || "Invalid promo code");
        setDiscountAmount(0);
        setIsPromoApplied(false);
      }
    } catch (err) {
      toast.error("Failed to verify promo");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId || phone.length < 10) {
      toast.error("Please enter a valid Table Number and Phone Number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      
      if (res.ok) {
        setOtpStep(true);
        toast.success("OTP Sent! (Use 1234 for testing)");
      } else {
        toast.error("Failed to send OTP");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const otpRes = await fetch(`${API_URL}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });

      if (!otpRes.ok) {
        toast.error("Invalid OTP code. Try 1234.");
        setIsSubmitting(false);
        return;
      }

      const orderPayload = {
        vendorId,
        tableId,
        customerPhone: phone,
        paymentMode,
        total: finalTotal,
        items: cart.map(c => ({
          name: c.name,
          qty: c.qty,
          price: c.price
        }))
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

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
        <h2 className="text-3xl font-bold text-white mb-2">Order Sent!</h2>
        <p className="text-gray-400 mb-8">
          {paymentMode === 'UPI' 
            ? "Your order is pending. Please show your payment success screen to the counter so the kitchen can begin!" 
            : "The kitchen has received your order. Please pay cash at the counter."}
        </p>
        <button onClick={onBack} className="bg-[#E5B35C] text-[#0B0E14] font-bold py-3 px-8 rounded-xl shadow-lg">
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-200 font-sans pb-24">
      <div className="sticky top-0 bg-[#13161F] border-b border-[#1F2330] p-4 flex items-center gap-4 z-10">
        <button onClick={onBack} className="text-[#E5B35C] font-bold text-xl">←</button>
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Order Summary */}
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

        {!isPromoApplied && (
          <div className="flex gap-2 mb-6">
            <input 
              type="text" placeholder="Have a promo code?" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="flex-1 bg-[#13161F] border border-[#1F2330] rounded-xl p-3 text-white text-sm focus:border-[#E5B35C] outline-none uppercase"
            />
            <button onClick={handleApplyPromo} className="bg-[#1F2330] text-white px-4 rounded-xl font-bold text-sm hover:bg-gray-700">Apply</button>
          </div>
        )}

        <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            {otpStep ? 'Complete Payment & Order' : 'Your Details'}
          </h2>
          
          {!otpStep ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Table Number</label>
                <input type="text" required placeholder="e.g. Table 4" value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
                <input type="tel" required placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C]">
                  {vendorPayment?.available && <option value="UPI">Pay via UPI / QR</option>}
                  <option value="CASH">Pay Cash at Counter</option>
                </select>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-[#E5B35C] text-[#0B0E14] font-bold py-3.5 rounded-xl transition-opacity disabled:opacity-50">
                {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              
              {/* 💳 DYNAMIC QR CODE DISPLAY */}
              {paymentMode === 'UPI' && vendorPayment?.available && (
                <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-4 text-center mb-6">
                  <h3 className="text-white font-bold mb-2">Scan & Pay ₹{finalTotal}</h3>
                  {vendorPayment.qrImagePath ? (
                    <img src={vendorPayment.qrImagePath} alt="Vendor QR Code" className="w-48 h-48 mx-auto rounded-lg mb-3 object-contain bg-white p-2" />
                  ) : (
                    <div className="w-48 h-48 mx-auto border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-xs mb-3">No QR Uploaded</div>
                  )}
                  <p className="text-xs text-gray-400 mb-1">UPI ID: <span className="text-white font-mono">{vendorPayment.upiId}</span></p>
                  <p className="text-[10px] text-[#E5B35C] mt-2">⚠️ Keep your success screen open to show the waiter!</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Enter 4-Digit OTP</label>
                <input type="text" required placeholder="1234" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-center text-xl tracking-widest" />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-[#E5B35C] text-[#0B0E14] font-bold py-3.5 rounded-xl transition-opacity disabled:opacity-50">
                {isSubmitting ? 'Sending to Kitchen...' : `I Have Paid & Verify Order`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}