import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useUser, useAuth } from '@clerk/clerk-react';

export default function Settings({ vendorId }: { vendorId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { getToken } = useAuth(); 
  const { user } = useUser();
  const accountEmail = user?.primaryEmailAddress?.emailAddress || '';
  
  // Clean Form State
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('Street Stall');
  const [address, setAddress] = useState(''); // 🌟 NEW: The address field

  // 1. Fetch their existing data when the page loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken(); 
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}` 
          }
        });        
        if (response.ok) {
          const data = await response.json();
          setName(data.name || '');
          setBusinessType(data.businessType || 'Street Stall');
          setAddress(data.address || ''); // 🌟 NEW: Load existing address
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [vendorId, getToken]);

  // 2. Save ALL changes to the backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const token = await getToken(); 
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        // 🌟 NEW: Include address in the payload
        body: JSON.stringify({ name, businessType, address }),
      });

      if (response.ok) {
        toast.success("Store profile updated successfully!");
        // Optional: You could trigger a global state update here so the Sidebar refreshes instantly
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast.error("Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading profile...</div>;
  }

  return (
    <div className="p-8 max-w-2xl font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-[#E5B35C] mb-2">Store Settings</h2>
        <p className="text-sm text-gray-400">Manage your business profile and public details.</p>
      </div>

      <form onSubmit={handleSave} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl">
        
        {/* Email */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Email</label>
          <input type="text" value={accountEmail} disabled className="w-full bg-[#0B0E14] border border-gray-800 text-gray-500 rounded-lg p-3 text-sm cursor-not-allowed" />
        </div>

        {/* Store Name */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Store Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-[#0B0E14] border border-[#2A2E39] text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none transition-colors" />
        </div>

        {/* 🌟 NEW: Location / Address */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Location / Address</label>
          <input 
            type="text" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            placeholder="e.g. Kothrud, Pune"
            className="w-full bg-[#0B0E14] border border-[#2A2E39] text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none transition-colors" 
          />
        </div>

        {/* Business Type */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Type</label>
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full bg-[#0B0E14] border border-[#2A2E39] text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none transition-colors appearance-none cursor-pointer">
            <option value="Street Stall">Street Food Stall</option>
            <option value="Food Truck">Food Truck</option>
            <option value="Cloud Kitchen">Cloud Kitchen</option>
            <option value="Cafe">Cafe / QSR</option>
          </select>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#1F2330]">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}