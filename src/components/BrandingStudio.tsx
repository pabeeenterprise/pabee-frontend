import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface BrandingStudioProps {
  vendorId: string;
}

export default function BrandingStudio({ vendorId }: BrandingStudioProps) {
  // UI State
  const [primaryColor, setPrimaryColor] = useState('#E5B35C');
  const [theme, setTheme] = useState('dark');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  
  // Loading States
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. THE UPLOAD ENGINE: Handles taking the file and pushing it to Supabase
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);

      // Create a unique file name so vendors don't overwrite each other's images
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendorId}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to your public bucket
      const { error: uploadError } = await supabase.storage
        .from('vendor-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL for the newly uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('vendor-assets')
        .getPublicUrl(filePath);

      // Update the live preview instantly
      if (type === 'logo') setLogoUrl(publicUrlData.publicUrl);
      if (type === 'banner') setBannerUrl(publicUrlData.publicUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // 2. THE SAVE ENGINE: Pushes the final choices to your Postgres Database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`https://pabee-backend.onrender.com/api/vendors/${vendorId}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryColor, theme, logoUrl, bannerUrl }),
      });

      if (!response.ok) throw new Error('Failed to save branding');
      alert('Brand identity saved successfully!');
    } catch (error) {
      console.error('Error saving branding:', error);
      alert('Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col md:flex-row gap-8 overflow-y-auto">
      
      {/* LEFT COLUMN: THE CONTROLS */}
      <div className="w-full md:w-1/2 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Branding Studio</h2>
          <p className="text-gray-400">Customize how your menu looks to your customers.</p>
        </div>

        {/* Color Picker */}
        <div className="bg-[#131823] p-6 rounded-xl border border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-2">Primary Brand Color</label>
          <div className="flex items-center gap-4">
            <input 
              type="color" 
              value={primaryColor} 
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-14 h-14 rounded cursor-pointer bg-transparent border-0 p-0"
            />
            <span className="text-gray-400 font-mono">{primaryColor.toUpperCase()}</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="bg-[#131823] p-6 rounded-xl border border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-4">Menu Theme</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setTheme('dark')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-[#E5B35C] text-black' : 'bg-gray-800 text-gray-300'}`}
            >
              Dark Mode
            </button>
            <button 
              onClick={() => setTheme('light')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${theme === 'light' ? 'bg-[#E5B35C] text-black' : 'bg-gray-800 text-gray-300'}`}
            >
              Light Mode
            </button>
          </div>
        </div>

        {/* Image Uploaders */}
        <div className="bg-[#131823] p-6 rounded-xl border border-gray-800 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Restaurant Logo</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, 'logo')}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Header Banner</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, 'banner')}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 cursor-pointer"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isUploading || isSaving}
          className="w-full py-3 bg-[#E5B35C] text-black font-bold rounded-xl hover:bg-[#d4a24b] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Brand Identity'}
        </button>
      </div>

      {/* RIGHT COLUMN: THE LIVE PREVIEW */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-8 bg-[#0B0E14] border-l border-gray-800">
        <div 
          className="w-[320px] h-[600px] rounded-[2.5rem] border-8 border-gray-900 overflow-hidden relative shadow-2xl transition-colors duration-300"
          style={{ backgroundColor: theme === 'dark' ? '#111827' : '#F3F4F6' }}
        >
          {/* Mock Phone Notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-xl w-32 mx-auto z-10"></div>

          {/* Banner Area */}
          <div className="h-32 w-full bg-gray-800 relative">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">No Banner</div>
            )}
            
            {/* Logo Overlapping the Banner */}
            <div className="absolute -bottom-8 left-4 w-16 h-16 rounded-full border-4 shadow-lg flex items-center justify-center overflow-hidden"
                 style={{ borderColor: theme === 'dark' ? '#111827' : '#F3F4F6', backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400">Logo</span>
              )}
            </div>
          </div>

          {/* Mock Menu Content */}
          <div className="pt-12 px-4">
            <h3 className="text-xl font-bold mb-4" style={{ color: theme === 'dark' ? '#FFFFFF' : '#111827' }}>Spice Street</h3>
            
            {/* Mock Category Buttons */}
            <div className="flex gap-2 mb-6">
              <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: primaryColor, color: '#000' }}>Popular</div>
              <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: theme === 'dark' ? '#374151' : '#E5E7EB', color: theme === 'dark' ? '#D1D5DB' : '#4B5563' }}>Mains</div>
            </div>

            {/* Mock Menu Item */}
            <div className="p-3 rounded-lg flex justify-between items-center mb-3" style={{ backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: theme === 'dark' ? '#F3F4F6' : '#111827' }}>Signature Samosa</p>
                <p className="text-xs mt-1" style={{ color: primaryColor }}>₹40</p>
              </div>
              <div className="w-16 h-16 bg-gray-700 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}