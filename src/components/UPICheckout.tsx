import { useState } from 'react';

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
  const encodedName = encodeURIComponent(merchantName || "Pabee Merchant");

  // 3. Create a short, safe Transaction Note (tn)
  const safeNote = `Order ${orderId.substring(0, 8)}`;

  // 4. Construct the crash-proof intent string (NO 'tr' parameter)
  const upiLink = `upi://pay?pa=${merchantVPA}&pn=${encodedName}&am=${formattedAmount}&tn=${encodeURIComponent(safeNote)}&cu=INR`;

  // 🛑 IF YOU STILL GET "SOMETHING WENT WRONG", UNCOMMENT THE LINE BELOW 
  // AND REPLACE WITH YOUR PERSONAL YBL/PAYTM VPA TO PROVE INDIAN BANK IS BLOCKING IT:
  // const upiLink = "upi://pay?pa=your_personal_handle@ybl&pn=Test%20Store&am=1.00&cu=INR";

  const handlePaymentClick = () => {
    // We do NOT use e.preventDefault() here because we want the browser to instantly open the app
    setIsLaunching(true);
    onProcessOrder().finally(() => {
      setIsLaunching(false);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#13161F] border border-gray-800 rounded-xl mt-4">
      <div className="text-center mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount to Pay</p>
        <h3 className="text-3xl font-bold text-white">₹{amount}</h3>
      </div>

      {/* Mobile Button: Native Anchor Tag ensures 100% intent delivery */}
      <a 
        href={upiLink}
        onClick={handlePaymentClick}
        className={`w-full bg-[#E55B3C] hover:bg-[#d45235] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors md:hidden shadow-lg shadow-[#E55B3C]/20 flex items-center justify-center gap-2 ${isLaunching ? 'opacity-75 pointer-events-none' : ''}`}
      >
        {isLaunching ? (
          <span className="animate-pulse">Opening App...</span>
        ) : (
          <>
            <span>⚡</span> Pay via UPI App
          </>
        )}
      </a>

      {/* Desktop View: Instructions for Laptop/Tablet users */}
      <div className="hidden md:flex flex-col items-center gap-2 p-4 bg-[#1A1D24] rounded-xl border border-gray-700">
        <p className="text-sm text-gray-300 font-medium text-center">
          Open your phone's camera to scan and pay via any UPI app (GPay, PhonePe, Paytm).
        </p>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Merchant: {merchantName} <br/> VPA: {merchantVPA}
        </p>
      </div>
    </div>
  );
}