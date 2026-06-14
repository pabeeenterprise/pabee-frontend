import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

// 🌟 NEW: The exact structure of your database items
interface PreviewItem {
  id: string;
  name: string;
  price: number;
  prep: string;
  veg: boolean;
  imageUrl?: string | null;
  emoji?: string;
}

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

  // Viewport Engine State
  const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  
  // 🌟 NEW: Real Menu Items State
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend.onrender.com';

  useEffect(() => {
    async function loadBrandingAndMenu() {
      try {
        const token = await getToken();
        
        // 1. Fetch Branding Configurations
        const brandRes = await fetch(`${API_URL}/api/vendors/${vendorId}/branding`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (brandRes.ok) {
          const data = await brandRes.json();
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

        // 2. 🌟 NEW: Fetch Real Menu Items for the Preview
        const menuRes = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          // Debug Trap: Prints exactly what the database handed over
          console.log("🚨 BRANDING STUDIO MENU FETCH:", menuData); 
          setPreviewItems(menuData.items && Array.isArray(menuData.items) ? menuData.items.slice(0, 6) : []);
        }

      } catch (err) {
        console.error("Failed to load configs", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (vendorId) loadBrandingAndMenu();
  }, [vendorId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size limit is 2MB");
      return;
    }

    const instantLocalUrl = URL.createObjectURL(file);
    if (target === 'logo') setLogoUrl(instantLocalUrl);
    if (target === 'banner') setBannerUrl(instantLocalUrl);

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
      
      toast.success(`${target === 'logo' ? 'Logo' : 'Banner'} uploaded! Click 'Save Branding' to lock it in.`);
    } catch (err) {
      console.error("Upload pipeline failed:", err);
      toast.error("Storage upload failed. Check console.");
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
    <div className="p-8 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 font-sans">
      
      {/* LEFT COLUMN: CONTROL SUITE */}
      <div className="xl:col-span-4 bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl space-y-6 h-fit">
        <div>
          <h2 className="text-2xl font-serif text-[#E5B35C] font-bold">Branding Studio</h2>
          <p className="text-xs text-gray-400 mt-1">Customize how your digital menu appears to customers.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Theme Mode</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setThemeMode('dark')} className={`py-3 rounded-xl font-bold text-sm transition-all border ${themeMode === 'dark' ? 'bg-[#1C120C] border-[#E5B35C] text-[#E5B35C]' : 'bg-[#0B0E14] border-gray-800 text-gray-400 hover:text-white'}`}>Dark Mode</button>
            <button type="button" onClick={() => setThemeMode('light')} className={`py-3 rounded-xl font-bold text-sm transition-all border ${themeMode === 'light' ? 'bg-white border-gray-300 text-black shadow-md' : 'bg-[#0B0E14] border-gray-800 text-gray-400 hover:text-white'}`}>Light Mode</button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Brand Accent Color</label>
          <div className="flex gap-3 items-center">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-12 bg-transparent border-0 cursor-pointer rounded-lg" />
            <input type="text" value={accentColor.toUpperCase()} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 bg-[#0B0E14] border border-gray-700 text-white rounded-xl p-3 text-sm font-mono focus:border-[#E5B35C] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Typography Font Pair</label>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-xl p-3 text-sm focus:border-[#E5B35C] focus:outline-none">
            <option value="font-sans">Modern Sans-Serif (Inter)</option>
            <option value="font-serif">Classic Serif (Playfair Display)</option>
            <option value="font-mono">Crisp Monospace (Space Mono)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Button Edge Profile</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'rounded-none', label: 'Sharp' },
              { id: 'rounded-xl', label: 'Soft' },
              { id: 'rounded-full', label: 'Pill' }
            ].map(shape => (
              <button key={shape.id} type="button" onClick={() => setButtonRoundness(shape.id)} className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${buttonRoundness === shape.id ? 'bg-[#E5B35C] text-black border-[#E5B35C]' : 'bg-[#0B0E14] border-gray-800 text-gray-400'}`}>{shape.label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Logo Avatar</label>
            <div className="border border-dashed border-[#1F2330] bg-[#0B0E14] rounded-xl p-4 text-center cursor-pointer relative hover:border-gray-600 transition-colors">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={isUploading} />
              <p className="text-xs text-gray-400">📷 {logoUrl ? 'Change' : 'Upload'}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Banner Photo</label>
            <div className="border border-dashed border-[#1F2330] bg-[#0B0E14] rounded-xl p-4 text-center cursor-pointer relative hover:border-gray-600 transition-colors">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={isUploading} />
              <p className="text-xs text-gray-400">🖼️ {bannerUrl ? 'Change' : 'Upload'}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1F2330] flex justify-end">
          <button type="button" onClick={handleSaveBranding} disabled={isSaving || isUploading} className="w-full bg-[#E5B35C] text-[#0B0E14] font-bold py-3 px-6 rounded-xl text-sm hover:bg-[#d4a24b] transition-all shadow-md disabled:opacity-50">
            {isSaving ? 'Synchronizing Customizations...' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: REACTIVE DEVICE PREVIEW SCOPE */}
      <div className="xl:col-span-8 flex flex-col items-center border border-[#1F2330] bg-[#0B0E14] p-8 rounded-2xl overflow-hidden relative min-h-[800px]">
        
        {/* Device Viewport Toggle */}
        <div className="flex bg-[#13161F] border border-[#1F2330] rounded-lg p-1 mb-6 shadow-xl w-full max-w-sm z-10 relative">
          <button 
            onClick={() => setDeviceView('mobile')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${deviceView === 'mobile' ? 'bg-[#E5B35C] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            📱 Mobile
          </button>
          <button 
            onClick={() => setDeviceView('tablet')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${deviceView === 'tablet' ? 'bg-[#E5B35C] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            📟 Tablet
          </button>
          <button 
            onClick={() => setDeviceView('desktop')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${deviceView === 'desktop' ? 'bg-[#E5B35C] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            💻 Desktop
          </button>
        </div>

        <div className="w-full text-center mb-6 text-gray-500 font-mono text-xs z-10 relative">
           <span>{deviceView === 'mobile' ? '📱 Mobile Viewpoint — 390px' : deviceView === 'tablet' ? '📟 Tablet Viewpoint — 768px' : '💻 Desktop Viewpoint — 1024px'}</span>
        </div>

        {/* The Dynamic Canvas Frame */}
        <div 
          className={`transition-all duration-500 ease-in-out border-[8px] border-[#1F2330] rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col absolute top-32 ${
            deviceView === 'mobile' ? 'w-[390px] h-[800px]' : 
            deviceView === 'tablet' ? 'w-[768px] h-[800px]' : 
            'w-[1024px] h-[800px]' 
          }`}
          style={{ 
            transformOrigin: 'top center', 
            transform: deviceView === 'desktop' ? 'scale(0.75)' : deviceView === 'tablet' ? 'scale(0.85)' : 'scale(1)' 
          }} 
        >
          
          <div className={`flex-1 overflow-y-auto no-scrollbar flex flex-col relative transition-colors duration-300 ${themeMode === 'dark' ? 'bg-[#0B0E14] text-white' : 'bg-gray-50 text-gray-900'} ${fontFamily}`}>
            
            <div className={`relative w-full overflow-hidden border-b border-black/20 shrink-0 ${deviceView === 'mobile' ? 'h-32' : 'h-48'}`}>
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white font-bold p-4 text-center">
                   <span className="text-sm opacity-50">No Banner Image</span>
                </div>
              )}
              
              <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full ${themeMode === 'dark' ? 'bg-[#13161F]' : 'bg-white'} border-4 ${themeMode === 'dark' ? 'border-[#0B0E14]' : 'border-gray-50'} overflow-hidden shadow-md flex items-center justify-center`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🍲</span>
                )}
              </div>
            </div>

            <div className="mt-10 px-6 pb-6 flex-1 flex flex-col">
              <h4 className="text-2xl font-bold tracking-tight text-center">{storeName}</h4>
              
              <div className="flex overflow-x-auto justify-center gap-2 mt-6 pb-2 no-scrollbar">
                <span className="px-5 py-1.5 rounded-full text-sm font-bold" style={{ backgroundColor: accentColor, color: '#000' }}>All</span>
                <span className={`px-5 py-1.5 rounded-full text-sm font-medium border ${themeMode === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'}`}>Food</span>
                <span className={`px-5 py-1.5 rounded-full text-sm font-medium border ${themeMode === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'}`}>Drinks</span>
              </div>

              {/* 🌟 NEW: Real Database Data Grid */}
              <div className={`w-full mt-6 grid gap-4 ${
                deviceView === 'mobile' ? 'grid-cols-1' : 
                deviceView === 'tablet' ? 'grid-cols-2' : 
                'grid-cols-3'
              }`}>
                {previewItems.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-50">
                    <span className="text-3xl mb-2">🍽️</span>
                    <p className="text-sm font-medium">Add items in the Menu Editor</p>
                  </div>
                ) : (
                  previewItems.map((item) => (
                    <div key={item.id} className={`p-4 rounded-2xl flex gap-4 items-center border transition-all ${themeMode === 'dark' ? 'bg-[#13161F] border-gray-800 hover:border-gray-600' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1.5 mb-1">
                           <span className="text-[9px]">{item.veg ? '🟢' : '🔴'}</span>
                           <h5 className="font-bold text-sm line-clamp-1">{item.name}</h5>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{item.prep}</p>
                        <div className="text-lg font-bold" style={{ color: accentColor }}>₹{item.price}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                         <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl overflow-hidden border ${themeMode === 'dark' ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'}`}>
                           {item.imageUrl ? (
                             <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                           ) : (
                             <span>{item.emoji || '🍲'}</span>
                           )}
                         </div>
                         <button type="button" className={`px-4 py-1.5 text-[10px] font-black tracking-wider uppercase text-black shadow-sm ${buttonRoundness} transition-transform active:scale-95`} style={{ backgroundColor: accentColor }}>
                           Add
                         </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}