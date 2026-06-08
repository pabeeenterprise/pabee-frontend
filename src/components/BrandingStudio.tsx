import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react'; // 👈 1. IMPORT CLERK AUTH

export default function BrandingStudio({ vendorId }: { vendorId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Branding State
  const [primaryColor, setPrimaryColor] = useState('#E5B35C');
  const [theme, setTheme] = useState('dark');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;
  
  // 👇 2. INITIALIZE CLERK AUTH
  const { getToken } = useAuth();

  // 1. Fetch Existing Branding (SECURED)
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const token = await getToken(); // Grab token
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` } // Attach badge
        });
        if (res.ok) {
          const data = await res.json();
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.theme) setTheme(data.theme);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.bannerUrl) setBannerUrl(data.bannerUrl);
        }
      } catch (error) {
        toast.error("Failed to load branding settings");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (vendorId) fetchBranding();
  }, [vendorId]); // Include getToken in dependencies if your linter complains, but it's usually stable

  // 2. Save Branding to Database (SECURED)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const token = await getToken(); // Grab token
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/branding`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Attach badge
        },
        body: JSON.stringify({ primaryColor, theme, logoUrl, bannerUrl }),
      });

      if (res.ok) {
        toast.success("Branding updated successfully!");
      } else {
        throw new Error("Failed to save branding");
      }
    } catch (error) {
      toast.error("Error saving branding settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading studio...</div>;

  return (
    <div className="p-8 max-w-4xl font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-[#E5B35C] mb-2">Branding Studio</h2>
        <p className="text-sm text-gray-400">Customize how your digital menu appears to customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- SETTINGS FORM --- */}
        <form onSubmit={handleSave} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl h-fit">
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Theme Mode</label>
            <div className="flex gap-4">
              <label className={`flex-1 cursor-pointer border rounded-xl p-4 text-center transition-all ${theme === 'dark' ? 'border-[#E5B35C] bg-[#E5B35C]/10 text-[#E5B35C]' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} className="hidden" />
                <span className="font-bold text-sm">Dark Mode</span>
              </label>
              <label className={`flex-1 cursor-pointer border rounded-xl p-4 text-center transition-all ${theme === 'light' ? 'border-[#E5B35C] bg-[#E5B35C]/10 text-[#E5B35C]' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} className="hidden" />
                <span className="font-bold text-sm">Light Mode</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand Accent Color</label>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <input 
                type="text" 
                value={primaryColor.toUpperCase()} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Logo URL (Supabase)</label>
            <input 
              type="url" 
              value={logoUrl} 
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none"
            />
          </div>

          <div className="mb-8">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banner Image URL</label>
            <input 
              type="url" 
              value={bannerUrl} 
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-[#E5B35C] focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </form>

        {/* --- LIVE PREVIEW --- */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Customer Mobile Preview</label>
          <div 
            className="w-full max-w-[320px] mx-auto h-[600px] rounded-[2.5rem] border-[8px] border-[#1F2330] overflow-hidden shadow-2xl relative"
            style={{ backgroundColor: theme === 'dark' ? '#0B0E14' : '#F3F4F6' }}
          >
            {/* Mock Banner */}
            <div 
              className="h-32 w-full bg-cover bg-center"
              style={{ 
                backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none',
                backgroundColor: bannerUrl ? 'transparent' : '#1F2330'
              }}
            />
            
            {/* Mock Content */}
            <div className="p-6 relative -top-8">
              {/* Mock Logo */}
              <div 
                className="w-16 h-16 rounded-full border-4 shadow-lg mb-4 bg-center bg-cover"
                style={{ 
                  backgroundColor: theme === 'dark' ? '#13161F' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#0B0E14' : '#F3F4F6',
                  backgroundImage: logoUrl ? `url(${logoUrl})` : 'none'
                }}
              />
              
              <h3 style={{ color: theme === 'dark' ? '#FFFFFF' : '#111827' }} className="font-serif text-2xl font-bold mb-1">Your Store</h3>
              <p style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }} className="text-sm mb-6">QR Digital Menu</p>

              {/* Mock Button */}
              <button 
                className="w-full py-3 rounded-xl font-bold text-[#0B0E14] transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                View Menu Items
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}