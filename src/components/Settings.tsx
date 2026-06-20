import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/clerk-react';

export default function Settings({ vendorId }: { vendorId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const accountEmail = user?.primaryEmailAddress?.emailAddress || '';
  
  // Form State
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('Street Stall');
  
  // Header Branding States (For Customer Menu)
  const [useLogoAsHeader, setUseLogoAsHeader] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // 🌟 NEW: Dashboard Branding State (For Admin Sidebar)
  const [dashboardLogoUrl, setDashboardLogoUrl] = useState('');
  const [isUploadingDashboardLogo, setIsUploadingDashboardLogo] = useState(false);

  // 1. Fetch their existing data when the page loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/profile`);
        if (response.ok) {
          const data = await response.json();
          setName(data.name || '');
          setBusinessType(data.businessType || 'Street Stall');
          setUseLogoAsHeader(data.useLogoAsHeader || false);
          setLogoUrl(data.logoUrl || '');
          // 🌟 NEW: Load existing dashboard logo
          setDashboardLogoUrl(data.dashboardLogoUrl || '');
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

  // 2. The Direct-to-Bucket Upload Handler (Customer Menu)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB to ensure fast menu loading.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      toast.loading("Uploading to storage...", { duration: 1500 });
      setTimeout(() => {
        setLogoUrl("https://fake-url.com/uploaded-logo.png"); 
        setIsUploadingLogo(false);
        toast.success("Logo uploaded! Don't forget to save changes.");
      }, 1500);
    } catch (error) {
      toast.error("Failed to upload image");
      setIsUploadingLogo(false);
    }
  };

  // 🌟 NEW: The Direct-to-Bucket Upload Handler (Admin Dashboard)
  const handleDashboardLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB.");
      return;
    }

    setIsUploadingDashboardLogo(true);
    try {
      toast.loading("Uploading dashboard logo...", { duration: 1500 });
      setTimeout(() => {
        setDashboardLogoUrl("https://fake-url.com/uploaded-dashboard-logo.png"); 
        setIsUploadingDashboardLogo(false);
        toast.success("Dashboard logo uploaded! Don't forget to save changes.");
      }, 1500);
    } catch (error) {
      toast.error("Failed to upload image");
      setIsUploadingDashboardLogo(false);
    }
  };

  // 3. Save ALL changes to the backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // 🌟 NEW: Include the dashboardLogoUrl in the payload
        body: JSON.stringify({ name, businessType, useLogoAsHeader, logoUrl, dashboardLogoUrl }),
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

        {/* Top Left Header Style (Customer Menu) */}
        <div className="mb-8 pt-6 border-t border-[#1F2330]">
          <h3 className="text-sm font-bold text-white mb-4">Header Branding Style</h3>
          
          <div className="flex items-center space-x-3 mb-4">
            <input 
              type="checkbox" 
              checked={useLogoAsHeader} 
              onChange={(e) => setUseLogoAsHeader(e.target.checked)}
              id="useLogoToggle"
              className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-[#E5B35C]"
            />
            <label htmlFor="useLogoToggle" className="text-sm font-medium text-gray-300 cursor-pointer">
              Display a graphic logo in the top-left menu header instead of text
            </label>
          </div>

          <div className={`transition-all duration-300 overflow-hidden ${useLogoAsHeader ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
            <div className="bg-[#0B0E14] border border-[#2A2E39] border-dashed rounded-lg p-4">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#1A1D24] file:text-[#E5B35C] hover:file:bg-[#2A2E39] cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 mt-2">Required: Landscape layout (e.g., 4:1 aspect ratio). Max size 2MB.</p>
              
              {logoUrl && (
                <div className="mt-3 text-xs text-green-400 flex items-center gap-2">
                  <span>✓ Logo successfully attached.</span>
                  <div className="h-6 w-20 bg-gray-800 border border-gray-700 rounded text-[8px] flex items-center justify-center text-gray-500">Preview Box</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🌟 NEW: DASHBOARD BRANDING UPLOAD */}
        <div className="mb-8 pt-6 border-t border-[#1F2330]">
          <h3 className="text-sm font-bold text-white mb-4">Dashboard Logo</h3>
          <p className="text-xs text-gray-400 mb-4">Replaces the "pabee" text in the top left corner of your admin panel.</p>
          <div className="bg-[#0B0E14] border border-[#2A2E39] border-dashed rounded-lg p-4">
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={handleDashboardLogoUpload}
              disabled={isUploadingDashboardLogo}
              className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#1A1D24] file:text-[#E5B35C] hover:file:bg-[#2A2E39] cursor-pointer"
            />
            <p className="text-[10px] text-gray-500 mt-2">Max size 2MB.</p>

            {/* Preview the uploaded (or simulated) dashboard logo */}
            {dashboardLogoUrl && (
              <div className="mt-3 text-xs text-green-400 flex items-center gap-2">
                <span>✓ Dashboard logo successfully attached.</span>
                <div className="h-6 w-20 bg-gray-800 border border-gray-700 rounded text-[8px] flex items-center justify-center text-gray-500">Preview Box</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#1F2330]">
          <button 
            type="submit"
            disabled={isSaving || isUploadingLogo || isUploadingDashboardLogo}
            className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}