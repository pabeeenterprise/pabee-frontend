import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
  imageUrl?: string | null; 
}

// 1. UPDATED INTERFACE: Strictly matches the database keys
interface VendorProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColor: string;
  themeMode: 'dark' | 'light';
  fontFamily: string;
  buttonRoundness: string;
}

export default function CustomerMenu({ vendorId, onGoToCheckout }: { vendorId: string, onGoToCheckout: () => void }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const { addToCart, cartCount } = useCart();
  
  const [activePromoBanner, setActivePromoBanner] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend.onrender.com';

          const profileRes = await fetch(`${API_URL}/api/vendors/${vendorId}/profile`);
          
          if (!profileRes.ok) {
            setLoading(false);
            return; 
          }
          
          const profileData = await profileRes.json();
          
          // 2. THE FIX: Correctly map the nested branding data
          setVendorProfile({
            id: profileData.id,
            name: profileData.storeName || profileData.name || 'Your Store',
            logoUrl: profileData.branding?.logoUrl || null,
            bannerUrl: profileData.branding?.bannerUrl || null,
            accentColor: profileData.branding?.accentColor || '#E5B35C',
            themeMode: profileData.branding?.themeMode || 'dark',
            fontFamily: profileData.branding?.fontFamily || 'font-sans',
            buttonRoundness: profileData.branding?.buttonRoundness || 'rounded-xl'
          });

          const realDbId = profileData.id;

          const menuRes = await fetch(`${API_URL}/api/vendors/${realDbId}/menu`);
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            if (menuData.items && Array.isArray(menuData.items)) {
               setMenu(menuData.items);
            } else {
               setMenu([]);
            }
          }
  
          const promoRes = await fetch(`${API_URL}/api/vendors/${realDbId}/promos`);
          if (promoRes.ok) {
            const promoData = await promoRes.json();
            const active = promoData.promos?.find((p: any) => p.isActive);
            if (active) {
              const discountText = active.type === 'FLAT' ? `₹${active.value} OFF` : `${active.value}% OFF`;
              setActivePromoBanner(`🎉 Use code ${active.code} for ${discountText} on orders over ₹${active.minOrderValue}!`);
            }
          }
        } catch (err) {
          console.error("Failed to load data", err);
        } finally {
          setLoading(false);
        }
    };

    fetchData();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <p className="font-medium text-gray-400 animate-pulse">Loading menu...</p>
      </div>
    );
  }

  if (!vendorProfile) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-center px-6">
        <span className="text-5xl mb-4">🍽️</span>
        <h2 className="text-2xl font-bold text-white mb-2">Menu Not Found</h2>
        <p className="text-gray-400">
          We couldn't find this restaurant. Please make sure you scanned a valid QR code!
        </p>
      </div>
    );
  }

  // 3. THE FIX: Use themeMode instead of theme
  const isDark = vendorProfile.themeMode === 'dark';
  const bgColor = isDark ? 'bg-[#0B0E14]' : 'bg-[#F9FAFB]';
  const headerBg = isDark ? 'bg-[#121212]/95' : 'bg-white/95';
  const cardBg = isDark ? 'bg-[#13161F]' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  const categories = ['All', ...new Set(menu.map((item) => item.category))];
  const displayedItems = activeCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  return (
    // 4. THE FIX: Inject fontFamily into the root wrapper
    <div className={`min-h-screen ${bgColor} ${textColor} pb-24 ${vendorProfile.fontFamily} transition-colors duration-300`}>
      
      {activePromoBanner && (
        <div 
          className="text-black text-xs font-bold text-center py-2 px-4 shadow-md tracking-wide"
          style={{ backgroundColor: vendorProfile.accentColor }} // 5. THE FIX: accentColor everywhere
        >
          {activePromoBanner}
        </div>
      )}

      <div className={`sticky top-0 ${headerBg} backdrop-blur-md border-b ${borderColor} z-10 shadow-sm`}>
        
        <div className="h-32 w-full bg-gray-800 relative border-b border-black/20">
          {vendorProfile.bannerUrl ? (
            <img src={vendorProfile.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
          ) : (
             <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-700"></div>
          )}
          
          <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 ${cardBg} rounded-full flex items-center justify-center shadow-lg border-4 ${borderColor} overflow-hidden`}>
             {vendorProfile.logoUrl ? (
               <img src={vendorProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
             ) : (
               <span className="text-3xl">🍲</span>
             )}
          </div>
        </div>

        <div className="pt-8 pb-3 flex flex-col items-center border-b border-gray-800/50">
          <h1 className="text-2xl font-bold tracking-tight">{vendorProfile.name}</h1>
        </div>
        
        <div className="flex overflow-x-auto px-4 py-3 space-x-3 no-scrollbar">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                activeCategory === category ? 'shadow-md' : 'border border-transparent'
              }`}
              style={{
                backgroundColor: activeCategory === category ? vendorProfile.accentColor : 'transparent',
                color: activeCategory === category ? '#000' : (isDark ? '#9CA3AF' : '#4B5563'),
                borderColor: activeCategory === category ? 'transparent' : (isDark ? '#374151' : '#D1D5DB')
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto mt-2">
        {displayedItems.length === 0 ? (
           <p className={`text-center my-10 ${mutedText}`}>No items available in this category.</p>
        ) : (
          displayedItems.map(item => (
            <div key={item.id} className={`${cardBg} rounded-2xl border ${borderColor} p-4 flex gap-4 transition-transform active:scale-[0.98] shadow-sm`}>
              
              <div className="flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      item.veg ? 'bg-green-900/10 text-green-600 border-green-800/30' : 'bg-red-900/10 text-red-600 border-red-800/30'
                    }`}>
                      {item.veg ? 'Veg' : 'Non-Veg'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className={`text-xs mt-1 line-clamp-2 ${mutedText}`}>{item.prep}</p>
                </div>
                
                <div className="flex items-center mt-4">
                  <span className="font-bold text-lg" style={{ color: vendorProfile.accentColor }}>₹{item.price}</span>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between shrink-0">
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl mb-2 border ${borderColor} bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0`}>
                 {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="text-3xl">{item.veg ? '🥗' : '🍗'}</span>
                  )}
              </div>
                 
                 <button 
                  onClick={() => addToCart(item)} 
                  // 6. THE FIX: Dynamic button roundness
                  className={`h-8 w-8 ${vendorProfile.buttonRoundness} font-bold flex items-center justify-center text-xl transition-colors bg-opacity-10 border border-opacity-30 hover:bg-opacity-100`}
                  style={{ 
                    color: vendorProfile.accentColor,
                    borderColor: vendorProfile.accentColor,
                    backgroundColor: `${vendorProfile.accentColor}1A` 
                  }}
                 >
                  +
                 </button>
              </div>
              
            </div>
          ))
        )}
      </div>

      {cartCount > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 ${headerBg} border-t ${borderColor} p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-50`}>
          <button 
            onClick={onGoToCheckout}
            className={`w-full text-black font-bold py-3.5 ${vendorProfile.buttonRoundness} flex justify-between px-6 transition-transform active:scale-95 shadow-md`}
            style={{ backgroundColor: vendorProfile.accentColor }}
          >
            <span>{cartCount} {cartCount === 1 ? 'Item' : 'Items'}</span>
            <span className="flex items-center gap-2">View Cart <span className="text-xl">→</span></span>
          </button>
        </div>
      )}

    </div>
  );
}