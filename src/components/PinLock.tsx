import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

interface PinLockProps {
  vendorId: string;
  onUnlocked: () => void;
  onCancel: () => void; // To send them back to the POS if they give up
}

export default function PinLock({ vendorId, onUnlocked, onCancel }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [isSettingNew, setIsSettingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  const verifyPin = async (enteredPin: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pin: enteredPin })
      });
      const data = await res.json();
      
      if (data.isSetupRequired) {
        setIsSettingNew(true);
        setPin(''); // Clear the field so they can type a new one
        toast("First time setup: Create a 4-digit Master PIN.");
      } else if (data.success) {
        onUnlocked();
      } else {
        toast.error("Incorrect PIN");
        setPin('');
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const setMasterPin = async (newPin: string) => {
     setLoading(true);
     try {
       const token = await getToken();
       const res = await fetch(`${API_URL}/api/vendors/${vendorId}/pin`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ pin: newPin })
       });
       
       if (res.ok) {
         toast.success("Master PIN Locked In!");
         onUnlocked(); // Instantly grant access after creation
       } else {
         toast.error("Failed to save PIN");
       }
     } catch (err) {
       toast.error("Network error");
     } finally {
       setLoading(false);
     }
  };

  const handleInput = (val: string) => {
    // Strip everything except numbers, max 4 digits
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    
    // Auto-submit the second the 4th digit is typed
    if (clean.length === 4) {
      if (isSettingNew) setMasterPin(clean);
      else verifyPin(clean);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0C10]/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="bg-[#13161F] border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative">
        
        {/* Cancel Button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-white mb-2">
          {isSettingNew ? 'Create Master PIN' : 'Enter Master PIN'}
        </h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
          {isSettingNew ? 'This locks your business data from staff' : 'Restricted Owner Access'}
        </p>
        
        <input 
          type="password" 
          autoFocus
          value={pin}
          onChange={(e) => handleInput(e.target.value)}
          className="w-full bg-[#1A1D24] text-center text-4xl tracking-[0.5em] font-black text-[#E5B35C] p-4 rounded-xl border border-gray-800 outline-none focus:border-[#E5B35C] transition-colors"
          placeholder="••••"
          disabled={loading}
        />
        
        {loading && <p className="text-gray-500 text-xs font-bold mt-4 uppercase animate-pulse">Verifying...</p>}
      </div>
    </div>
  );
}