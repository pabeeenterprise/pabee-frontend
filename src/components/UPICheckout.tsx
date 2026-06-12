import { useState } from 'react';
// Make sure to import your QR library if you want to show it on desktop!
// import QRCode from 'react-qr-code'; 

interface UPIOrderProps {
  merchantVPA: string;
  merchantName: string;
  amount: number;
  orderId: string;
  onProcessOrder: () => Promise<void>; 
}

export default function UPICheckout({ merchantVPA, merchantName, amount, orderId, onProcessOrder }: UPIOrderProps) {
  const [isLaunching, setIsLaunching] = useState(false);

  // 1. Force strict 2-decimal float
  const formattedAmount = Number(amount).toFixed(2);

  // 2. Safely encode spaces in the vendor name
  const encodedName = encodeURIComponent(merchantName);

  // 3. Create a short, safe Transaction Note (tn) instead of a Reference ID (tr)
  // This will just show up in the customer's bank statement like "Order 550e8400"
  const safeNote = `Order ${orderId.substring(0, 8)}`;

  // 4. THE FIX: The absolute minimal string. NO "tr=" PARAMETER.
  const upiLink = `upi://pay?pa=${merchantVPA}&pn=${encodedName}&am=${formattedAmount}&tn=${encodeURIComponent(safeNote)}&cu=INR`;
  
  const handleMobileIntent = async () => {
    setIsLaunching(true);
    await onProcessOrder(); 
    window.location.href = upiLink; 
    setIsLaunching(false);
  };

  // ... keep the rest of your return() statement exactly the same!
  // Just update the button text to say {isLaunching ? "Opening..." : "⚡ Pay via UPI App"}
  
    return (
      <div className="flex flex-col gap-4 p-5 bg-[#13161F] border border-gray-800 rounded-xl mt-4">
        <div className="text-center mb-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount to Pay</p>
          <h3 className="text-3xl font-bold text-white">₹{amount}</h3>
        </div>
  
        {/* Mobile Button: Launches UPI App Directly */}
      <button 
        onClick={handleMobileIntent}
        disabled={isLaunching}
        className="w-full bg-[#E55B3C] disabled:bg-gray-700 hover:bg-[#d45235] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors md:hidden shadow-lg shadow-[#E55B3C]/20 flex items-center justify-center gap-2"
      >
        {isLaunching ? (
          <span className="animate-pulse">Opening App...</span>
        ) : (
          <>
            <span>⚡</span> Pay via UPI App
          </>
        )}
      </button>
  
        {/* Desktop View: Instructions for Laptop/Tablet users */}
        <div className="hidden md:flex flex-col items-center gap-2 p-4 bg-[#1A1D24] rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 font-medium text-center">
            Open your phone's camera to scan and pay via any UPI app (GPay, PhonePe, Paytm).
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Merchant: {merchantName} <br/> VPA: {merchantVPA}
          </p>
        </div>
      </div>
    );
  }