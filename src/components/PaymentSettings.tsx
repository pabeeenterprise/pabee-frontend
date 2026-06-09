import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase'; // Ensure this path matches your project structure
import toast from 'react-hot-toast';

export default function PaymentSettings({ vendorId }: { vendorId: string }) {
  const [upiId, setUpiId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
          setUpiId(data.upiId || '');
          setQrPreviewUrl(data.qrImagePath || '');
          setIsActive(data.isActive !== false);
        }
      } catch (error) {
        console.error("No existing payment data found.");
      } finally {
        setIsLoading(false);
      }
    };
    if (vendorId) fetchPaymentData();
  }, [vendorId]);

  // 2. Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      e.target.value = ''; 
      return;
    }
    setQrFile(file);
    
    // Create a temporary local URL so the vendor can see the image before saving
    setQrPreviewUrl(URL.createObjectURL(file));
  };

  // 3. Save Data (Upload to Supabase -> Save to Postgres)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let finalQrUrl = qrPreviewUrl;

    try {
      // Step A: Upload Image to Supabase if a new one was selected
      if (qrFile) {
        const fileExt = qrFile.name.split('.').pop();
        const fileName = `${vendorId}-qr-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('qr-codes') // 👈 Matches the bucket you just created
          .upload(fileName, qrFile, { upsert: true });

        if (uploadError) throw new Error("Failed to upload QR code to Supabase.");

        const { data } = supabase.storage.from('qr-codes').getPublicUrl(fileName);
        finalQrUrl = data.publicUrl;
      }

      // Step B: Save all data to Postgres via your secure backend
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          upiId,
          qrImagePath: finalQrUrl,
          isActive
        })
      });

      if (!res.ok) throw new Error("Failed to save to database.");
      
      toast.success("Payment settings updated!");
      setQrPreviewUrl(finalQrUrl); // Lock in the live URL
      setQrFile(null); // Clear the pending file state
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
        <p className="text-sm text-gray-400">Configure your direct UPI payment QR code for customers.</p>
      </div>

      <form onSubmit={handleSave} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl">
        
        {/* Toggle Switch */}
        <div className="mb-8 flex items-center justify-between border-b border-gray-800 pb-6">
          <div>
            <label className="block text-sm font-bold text-white mb-1">Accept Direct UPI</label>
            <p className="text-xs text-gray-500">Allow customers to pay directly to your bank account via QR code.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E5B35C]"></div>
          </label>
        </div>

        <div className={`transition-opacity ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* UPI ID Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Merchant UPI ID</label>
            <input 
              type="text" 
              value={upiId} 
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g., yourname@okicici"
              required={isActive}
              className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none"
            />
          </div>

          {/* QR Code Upload */}
          <div className="mb-8">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Static QR Code Image</label>
            
            <div className="flex items-center gap-6 mt-4">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-700 bg-[#0B0E14] flex items-center justify-center overflow-hidden shrink-0">
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
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#E5B35C]/10 file:text-[#E5B35C] hover:file:bg-[#E5B35C]/20 transition-all cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">JPEG, PNG, or WEBP up to 2MB. This image will be displayed on the customer checkout screen.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50"
          >
            {isSaving ? 'Encrypting & Saving...' : 'Save Payment Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}