import { useState } from 'react';
import { useCart } from '../context/CartContext';

// 1. Load Razorpay Script (Safely outside the component)
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout({ vendorId, tableId, onBack }: { vendorId: string, tableId: string, onBack: () => void }) {
    const { cart, cartTotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH'>('ONLINE');

  // Standard Indian restaurant tax/fee structure
  const gst = Math.round(cartTotal * 0.05); // 5% GST on food
  const platformFee = 5;
  const grandTotal = cartTotal + gst + platformFee;

  const handlePayment = async () => {
    setIsProcessing(true);

    // ==========================================
    // FLOW 1: CASH PAYMENT (Direct to Database)
    // ==========================================
    if (paymentMethod === 'CASH') {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId,
            tableId: tableId,
            items: cart,
            total: grandTotal,
            paymentMode: 'CASH',
            customerPhone: '9876543210'
          })
        });

        if (res.ok) {
          clearCart();
          alert("🎉 Order placed! Please pay cash at the counter.");
          onBack();
        } else {
          alert("Failed to place order. Please try again.");
        }
      } catch (err) {
        console.error(err);
        alert("Network error.");
      } finally {
        setIsProcessing(false);
      }
      return; // Stop here for cash
    }

    // ==========================================
    // FLOW 2: RAZORPAY ONLINE PAYMENT
    // ==========================================
    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      setIsProcessing(false);
      return;
    }

    try {
      // Ask backend to create a Razorpay Order ID
      const orderResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal })
      });
      const orderData = await orderResponse.json();

      // Open Razorpay Popup
      const options = {
        key: 'rzp_test_1234567890abcd', // 👈 REMEMBER TO PUT YOUR TEST KEY HERE!
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Pabee Street Food",
        description: "Order Payment",
        order_id: orderData.id,
        handler: async function (response: any) {
          // THIS RUNS ONLY IF PAYMENT IS SUCCESSFUL
          try {
            const dbRes = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vendorId,
                tableId: 'Table-4',
                items: cart,
                total: grandTotal,
                paymentMode: 'UPI', 
                customerPhone: '9876543210'
              })
            });

            if (dbRes.ok) {
              clearCart();
              alert(`🎉 Payment Successful! (ID: ${response.razorpay_payment_id})`);
              onBack();
            }
          } catch (err) {
            console.error("Database save failed:", err);
            alert("Payment worked, but order failed to send to kitchen.");
          }
        },
        prefill: {
          name: "Test Customer",
          contact: "9876543210",
        },
        theme: {
          color: "#E55B3C" // Matches your Pabee Orange!
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error(err);
      alert("Something went wrong with the payment gateway.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
        <button onClick={onBack} className="bg-[#E55B3C] text-white px-6 py-2 rounded-lg font-bold">
          Go back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 pb-28 font-sans">
      
      {/* Header */}
      <div className="sticky top-0 bg-[#121212]/95 backdrop-blur-md border-b border-gray-800 z-10 px-4 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
          ←
        </button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
        
        {/* Order Summary */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 p-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Order Summary</h2>
          
          <div className="flex flex-col gap-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-sm border ${item.veg ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20'} flex items-center justify-center`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.veg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-200">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price} x {item.qty}</p>
                  </div>
                </div>
                <div className="font-bold text-gray-300">₹{item.price * item.qty}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 p-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Bill Details</h2>
          
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="text-gray-200">₹{cartTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span className="text-gray-200">₹{platformFee}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span>GST (5%)</span>
              <span className="text-gray-200">₹{gst}</span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-lg text-white">
              <span>To Pay</span>
              <span className="text-[#E55B3C]">₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 p-4 flex flex-col gap-3">
           <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pay Via</h2>
           
           <button 
             onClick={() => setPaymentMethod('ONLINE')}
             className={`flex items-center justify-between p-3 rounded-xl border ${paymentMethod === 'ONLINE' ? 'border-[#E55B3C] bg-[#E55B3C]/10' : 'border-gray-800 bg-[#121212]'}`}
           >
             <div className="flex items-center gap-3">
               <span className="text-xl">💳</span>
               <span className="font-bold text-sm">UPI, Cards & Netbanking</span>
             </div>
             <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'ONLINE' ? 'border-[#E55B3C] bg-[#E55B3C]' : 'border-gray-600'}`}></div>
           </button>

           <button 
             onClick={() => setPaymentMethod('CASH')}
             className={`flex items-center justify-between p-3 rounded-xl border ${paymentMethod === 'CASH' ? 'border-[#E55B3C] bg-[#E55B3C]/10' : 'border-gray-800 bg-[#121212]'}`}
           >
             <div className="flex items-center gap-3">
               <span className="text-xl">💵</span>
               <span className="font-bold text-sm">Cash at Counter</span>
             </div>
             <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'CASH' ? 'border-[#E55B3C] bg-[#E55B3C]' : 'border-gray-600'}`}></div>
           </button>
        </div>

      </div>

      {/* FLOATING ACTION BUTTON (Always Visible, changes text based on selection) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.8)] z-50">
        <button 
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-[#E55B3C] disabled:bg-gray-700 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95"
        >
          {isProcessing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <span>{paymentMethod === 'ONLINE' ? `Pay ₹${grandTotal} Securely` : `Place Cash Order (₹${grandTotal})`}</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}