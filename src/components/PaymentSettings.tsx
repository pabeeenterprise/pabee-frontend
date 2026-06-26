import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function PaymentSettings({ vendorId }: { vendorId: string }) {
  // Master Switches
  const [paymentType, setPaymentType] = useState('UPI');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // UPI State
  const [upiId, setUpiId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  
  // Razorpay State
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [hasSecret, setHasSecret] = useState(false); // Security flag

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Existing Payment Data
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/payment`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setPaymentType(data.paymentType || 'UPI');
          setIsActive(data.isActive !== false);
          
          setUpiId(data.upiId || '');
          setQrPreviewUrl(data.qrImagePath || '');
          
          setRazorpayKeyId(data.razorpayKeyId || '');
          setHasSecret(data.hasRazorpaySecret || false);
        }
      } catch (error) {
        console.error("No existing payment data found.");
      } finally {
        setIsLoading(false);
      }
    };
    if (vendorId) fetchPaymentData();
  }, [vendorId, API_URL, getToken]);

  // 2. Handle File Selection (For UPI)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      e.target.value = ''; 
      return;
    }
    setQrFile(file);
    setQrPreviewUrl(URL.createObjectURL(file));
  };

  // 3. Save Data
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let finalQrUrl = qrPreviewUrl;

    try {
      if (qrFile && paymentType === 'UPI') {
        const fileExt = qrFile.name.split('.').pop();
        const fileName = `${vendorId}-qr-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('qr-codes')
          .upload(fileName, qrFile, { upsert: true });

        if (uploadError) throw new Error("Failed to upload QR code to Supabase.");

        const { data } = supabase.storage.from('qr-codes').getPublicUrl(fileName);
        finalQrUrl = data.publicUrl;
      }

      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentType,
          isActive,
          upiId,
          qrImagePath: finalQrUrl,
          razorpayKeyId,
          razorpayKeySecret
        })
      });

      if (!res.ok) throw new Error("Failed to save to database.");
      
      toast.success("Payment settings updated!");
      setQrPreviewUrl(finalQrUrl); 
      setQrFile(null); 
      setRazorpayKeySecret(''); // Clear the secret field for security after saving
      if (razorpayKeySecret) setHasSecret(true); // Update the flag

    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500 animate-pulse">Loading payment settings...</div>;

  return (
    <div className="p-8 max-w-2xl font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-[#E5B35C] mb-2">Payment Settings</h2>
        <p className="text-sm text-gray-400">Configure how customers pay for their orders.</p>
      </div>

      <form onSubmit={handleSave} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl">
        
        {/* Toggle Switch */}
        <div className="mb-6 flex items-center justify-between border-b border-[#1F2330] pb-6">
          <div>
            <label className="block text-sm font-bold text-white mb-1">Enable Digital Payments</label>
            <p className="text-xs text-gray-500">Allow customers to pay through the app.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E5B35C]"></div>
          </label>
        </div>

        <div className={`transition-opacity ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Payment Type Selector */}
          <div className="mb-8 border-b border-[#1F2330] pb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Payment Gateway Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentType('UPI')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all ${paymentType === 'UPI' ? 'bg-[#E5B35C]/10 border-[#E5B35C] text-[#E5B35C]' : 'bg-[#0B0E14] border-gray-800 text-gray-500 hover:border-gray-600'}`}
              >
                Static UPI QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('RAZORPAY')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all ${paymentType === 'RAZORPAY' ? 'bg-[#E5B35C]/10 border-[#E5B35C] text-[#E5B35C]' : 'bg-[#0B0E14] border-gray-800 text-gray-500 hover:border-gray-600'}`}
              >
                Razorpay Gateway
              </button>
            </div>
          </div>

          {/* --- UPI CONFIGURATION --- */}
          {paymentType === 'UPI' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Merchant UPI ID</label>
                <input 
                  type="text" 
                  value={upiId} 
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g., yourname@okicici"
                  required={isActive && paymentType === 'UPI'}
                  className="w-full bg-[#0B0E14] border border-[#2A2E39] text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none"
                />
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Static QR Code Image</label>
                <div className="flex items-center gap-6 mt-4">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#2A2E39] bg-[#0B0E14] flex items-center justify-center overflow-hidden shrink-0">
                    {qrPreviewUrl ? (
                      <img src={qrPreviewUrl} alt="QR Preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-600 text-xs text-center p-2">No QR Uploaded</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#1A1D24] file:text-[#E5B35C] hover:file:bg-[#2A2E39] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- RAZORPAY CONFIGURATION --- */}
          {paymentType === 'RAZORPAY' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Razorpay Key ID</label>
                <input 
                  type="text" 
                  value={razorpayKeyId} 
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_..."
                  required={isActive && paymentType === 'RAZORPAY'}
                  className="w-full bg-[#0B0E14] border border-[#2A2E39] text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none font-mono"
                />
              </div>
              
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Razorpay Key Secret</label>
                <input 
                  type="password" 
                  value={razorpayKeySecret} 
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder={hasSecret ? "•••••••••••••••• (Key is securely saved)" : "Enter Key Secret"}
                  required={isActive && paymentType === 'RAZORPAY' && !hasSecret}
                  className="w-full bg-[#0B0E14] border border-[#2A2E39] text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-2">For security, your existing secret key is not displayed. Only type here if you need to update it.</p>
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-end pt-4 border-t border-[#1F2330]">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving Profile...' : 'Save Payment Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}