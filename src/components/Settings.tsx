import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Settings({ vendorId }: { vendorId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('Street Stall');
  const [email, setEmail] = useState('');

  // 1. Fetch their existing data when the page loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Change localhost to your Render URL if testing live!
        const response = await fetch(`http://localhost:3000/api/vendors/${vendorId}/profile`);
        if (response.ok) {
          const data = await response.json();
          setName(data.name || '');
          setBusinessType(data.businessType || 'Street Stall');
          setEmail(data.email || '');
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [vendorId]);

  // 2. Save changes to the backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`http://localhost:3000/api/vendors/${vendorId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, businessType }),
      });

      if (response.ok) {
        toast.success("Store profile updated successfully!");
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
        
        {/* Email (Read Only - Managed by Clerk) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Account Email (Managed via Google)
          </label>
          <input 
            type="email" 
            value={email}
            disabled
            className="w-full bg-[#0B0E14] border border-gray-800 text-gray-500 rounded-lg p-3 text-sm cursor-not-allowed"
          />
        </div>

        {/* Store Name */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Store Name
          </label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spice Street Kitchen"
            required
            className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none transition-colors"
          />
        </div>

        {/* Business Type */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Business Type
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none transition-colors appearance-none"
          >
            <option value="Street Stall">Street Food Stall</option>
            <option value="Food Truck">Food Truck</option>
            <option value="Cloud Kitchen">Cloud Kitchen</option>
            <option value="Cafe">Cafe / QSR</option>
          </select>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}