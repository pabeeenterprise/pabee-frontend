import { useState, useEffect } from 'react';
import { Clock, Flame, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function PickupScreen({ orderId, onBack }: { orderId: string, onBack: () => void }) {
  // We relax the type here just in case the backend is sending something unexpected
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          // Force it to lowercase just in case Prisma is capitalizing it
          setStatus(data.kitchenStatus ? data.kitchenStatus.toLowerCase() : 'unknown');
        }
      } catch (error) {
        console.error("Failed to fetch order status");
      }
    };

    fetchStatus(); 
    const interval = setInterval(fetchStatus, 3000); 
    
    if (status === 'completed') clearInterval(interval);
    
    return () => clearInterval(interval);
  }, [orderId, status]);

  return (
    <div className="max-w-md mx-auto p-6 mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* THE TOKEN */}
      <div className="mb-8">
        <p className="text-sm font-bold text-muted uppercase tracking-widest mb-1">Your Token Number</p>
        <h1 className="text-6xl font-black text-blue tracking-tighter">
          #{orderId.slice(-4).toUpperCase()}
        </h1>
      </div>

      {/* LIVE STATUS UI */}
      <div className="space-y-4 relative">
        
        {/* Pending Step */}
        {status === 'pending' && (
          <div className="flex flex-col items-center p-8 border-2 border-blue bg-blue-soft rounded-2xl">
            <Clock className="w-12 h-12 mb-4 text-blue animate-pulse" />
            <h3 className="font-bold text-xl text-text">Order Received</h3>
            <p className="text-sm text-muted mt-2">Waiting for the vendor to accept...</p>
          </div>
        )}

        {/* Preparing Step */}
        {status === 'preparing' && (
          <div className="flex flex-col items-center p-8 border-2 border-amber bg-amber-soft rounded-2xl animate-in zoom-in-95 duration-300">
            <Flame className="w-12 h-12 mb-4 text-amber animate-bounce" />
            <h3 className="font-bold text-xl text-text">Currently Cooking</h3>
            <p className="text-sm text-amber mt-2 font-medium">Your food is on the grill!</p>
          </div>
        )}

        {/* Completed Step */}
        {status === 'completed' && (
          <div className="flex flex-col items-center p-8 border-2 border-green bg-green-soft rounded-2xl shadow-xl animate-in zoom-in-95 duration-300">
            <CheckCircle2 className="w-16 h-16 mb-4 text-green" />
            <h3 className="font-black text-2xl text-green uppercase tracking-wide">Ready for Pickup!</h3>
            <p className="text-sm text-green/80 mt-2 font-bold">Please show your token number at the counter.</p>
          </div>
        )}

        {/* 🚨 THE DEBUG CATCH-ALL 🚨 */}
        {status !== 'pending' && status !== 'preparing' && status !== 'completed' && (
          <div className="flex flex-col items-center p-8 border-2 border-red-500 bg-red-50 rounded-2xl">
            <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
            <h3 className="font-bold text-xl text-red-700">UI Status Mismatch</h3>
            <p className="text-sm text-red-600 mt-2">
              The database sent back an unknown status:<br/>
              <strong className="text-lg text-red-900 bg-white px-2 py-1 rounded mt-2 inline-block">"{status}"</strong>
            </p>
          </div>
        )}
      </div>

      {/* BACK BUTTON */}
      {status === 'completed' && (
        <button 
          onClick={onBack}
          className="mt-10 w-full bg-blue text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
        >
          <ArrowLeft size={20} /> Order More Food
        </button>
      )}
    </div>
  );
}