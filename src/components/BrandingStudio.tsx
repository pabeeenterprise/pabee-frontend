import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

export default function BrandingStudio({ vendorId }: { vendorId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Core Branding States
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState('#FF0000');
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [buttonRoundness, setButtonRoundness] = useState('rounded-xl');
  const [storeName, setStoreName] = useState('Your Store');
  
  // Storage URLs
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function loadBranding() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/branding`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.branding) {
            setThemeMode(data.branding.themeMode || 'dark');
            setAccentColor(data.branding.accentColor || '#FF0000');
            setFontFamily(data.branding.fontFamily || 'font-sans');
            setButtonRoundness(data.branding.buttonRoundness || 'rounded-xl');
            setLogoUrl(data.branding.logoUrl || '');
            setBannerUrl(data.branding.bannerUrl || '');
            setStoreName(data.storeName || 'Your Store');
          }
        }
      } catch (err) {
        console.error("Failed to load layout configs", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (vendorId) loadBranding();
  }, [vendorId]);

  // Automated Supabase Upload Processor
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size limit is 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendorId}-${target}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('vendor-assets').getPublicUrl(fileName);
      if (target === 'logo') setLogoUrl(data.publicUrl);
      if (target === 'banner') setBannerUrl(data.publicUrl);
      toast.success(`${target === 'logo' ? 'Logo' : 'Banner'} uploaded successfully!`);
    } catch (err) {
      toast.error("Upload pipeline failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/branding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          themeMode, accentColor, fontFamily, buttonRoundness, logoUrl, bannerUrl
        })
      });
      if (res.ok) toast.success("Branding updated successfully!");
      else throw new Error();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500 animate-pulse">Loading engine configurations...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      
      {/* LEFT COLUMN: CONTROL SUITE */}
      <div className="lg:col-span-7 bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-2xl font-serif text-[#E5B35C] font-bold">Branding Studio</h2>
          <p className="text-xs text-gray-400 mt-1">Customize how your digital menu appears to customers.</p>
        </div>

        {/* Theme Mode Option */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Theme Mode</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setThemeMode('dark')} className={`py-3 rounded-xl font-bold text-sm transition-all border ${themeMode === 'dark' ? 'bg-[#1C120C] border-[#E5B35C] text-[#E5B35C]' : 'bg-[#0B0E14] border-gray-800 text-gray-400 hover:text-white'}`}>Dark Mode</button>
            <button type="button" onClick={() => setThemeMode('light')} className={`py-3 rounded-xl font-bold text-sm transition-all border ${themeMode === 'light' ? 'bg-white border-gray-300 text-black shadow-md' : 'bg-[#0B0E14] border-gray-800 text-gray-400 hover:text-white'}`}>Light Mode</button>
          </div>
        </div>

        {/* Brand Accent Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Brand Accent Color</label>
          <div className="flex gap-3 items-center">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-12 bg-transparent border-0 cursor-pointer rounded-lg" />
            <input type="text" value={accentColor.toUpperCase()} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 bg-[#0B0E14] border border-gray-700 text-white rounded-xl p-3 text-sm font-mono focus:border-[#E5B35C] focus:outline-none" />
          </div>
        </div>

        {/* Font Family Curated Matrix */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Typography Font Pair</label>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-xl p-3 text-sm focus:border-[#E5B35C] focus:outline-none">
            <option value="font-sans">Modern Sans-Serif (Inter)</option>
            <option value="font-serif">Classic Serif (Playfair Display)</option>
            <option value="font-mono">Crisp Monospace (Space Mono)</option>
          </select>
        </div>

        {/* Button Style Configurations */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Button Edge Profile</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'rounded-none', label: 'Sharp' },
              { id: 'rounded-xl', label: 'Soft Rounded' },
              { id: 'rounded-full', label: 'Pill Shape' }
            ].map(shape => (
              <button key={shape.id} type="button" onClick={() => setButtonRoundness(shape.id)} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${buttonRoundness === shape.id ? 'bg-[#E5B35C] text-black border-[#E5B35C]' : 'bg-[#0B0E14] border-gray-800 text-gray-400'}`}>{shape.label}</button>
            ))}
          </div>
        </div>

        {/* Automated Drag/Pick Upload Triggers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Logo Avatar Icon</label>
            <div className="border border-dashed border-[#1F2330] bg-[#0B0E14] rounded-xl p-4 text-center cursor-pointer relative hover:border-gray-600 transition-colors">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={isUploading} />
              <p className="text-xs text-gray-400">📷 {logoUrl ? 'Change Logo Icon' : 'Upload Logo Avatar'}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Banner Header Photo</label>
            <div className="border border-dashed border-[#1F2330] bg-[#0B0E14] rounded-xl p-4 text-center cursor-pointer relative hover:border-gray-600 transition-colors">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={isUploading} />
              <p className="text-xs text-gray-400">🖼️ {bannerUrl ? 'Change Banner' : 'Upload Banner Image'}</p>
            </div>
          </div>
        </div>

        {/* Global Save Action */}
        <div className="pt-4 border-t border-[#1F2330] flex justify-end">
          <button type="button" onClick={handleSaveBranding} disabled={isSaving || isUploading} className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-[#d4a24b] transition-all shadow-md disabled:opacity-50">
            {isSaving ? 'Synchronizing Customizations...' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: REACTIVE MOBILE PREVIEW SCOPE */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Customer Mobile Preview</span>
        
        {/* Outer Phone Blueprint Frame */}
        <div className="w-full max-w-[320px] aspect-[9/18] bg-[#000000] rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 ring-4 ring-gray-900 flex flex-col overflow-hidden">
          
          {/* Inner Webview Viewport Frame */}
          <div className={`flex-1 rounded-[32px] overflow-hidden flex flex-col relative transition-all ${themeMode === 'dark' ? 'bg-[#0B0E14] text-white' : 'bg-gray-50 text-gray-900'} ${fontFamily}`}>
            
            {/* Banner Segment Canvas */}
            <div className="h-28 bg-gray-800 relative w-full overflow-hidden border-b border-black/20">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-[10px] text-gray-600 font-mono">No Banner Img Context</div>
              )}
              
              {/* Overlapping Absolute Logo Element */}
              <div className="absolute -bottom-6 left-6 w-14 h-14 rounded-full bg-gray-700 border-2 border-[#0B0E14] overflow-hidden shadow-md flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-gray-400">Avatar</span>
                )}
              </div>
            </div>

            {/* Core Content Body Text Elements */}
            <div className="mt-8 px-6 flex-1 space-y-4">
              <div>
                <h4 className="text-lg font-bold tracking-tight">{storeName}</h4>
                <p className="text-[10px] text-gray-500 font-medium">QR Digital Menu</p>
              </div>

              {/* Dynamic Action Button Render Hook */}
              <div className="pt-2">
                <button type="button" className={`w-full py-3 text-center text-xs font-bold text-white shadow-lg transition-transform hover:scale-[0.98] ${buttonRoundness}`} style={{ backgroundColor: accentColor }}>
                  View Menu Items
                </button>
              </div>
              
              {/* Dummy Item Wireframe list */}
              <div className="pt-2 space-y-2 opacity-40">
                <div className={`p-3 rounded-xl flex justify-between items-center ${themeMode === 'dark' ? 'bg-[#13161F]' : 'bg-white shadow-sm'}`}>
                  <div className="h-3 w-20 bg-gray-600 rounded"></div>
                  <div className="h-3 w-8 bg-[#E5B35C] rounded"></div>
                </div>
                <div className={`p-3 rounded-xl flex justify-between items-center ${themeMode === 'dark' ? 'bg-[#13161F]' : 'bg-white shadow-sm'}`}>
                  <div className="h-3 w-16 bg-gray-600 rounded"></div>
                  <div className="h-3 w-8 bg-[#E5B35C] rounded"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}