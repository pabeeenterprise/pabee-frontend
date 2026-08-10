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
  description?: string | null; 
}

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
  const { addToCart, cartCount, cartTotal } = useCart();
  const [activePromo, setActivePromo] = useState<any | null>(null);

  // Trigger re-animation when category changes
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
          const profileRes = await fetch(`${API_URL}/api/vendors/${vendorId}/profile`);
          
          if (!profileRes.ok) {
            setLoading(false);
            return; 
          }
          
          const profileData = await profileRes.json();
          
          setVendorProfile({
            id: profileData.id,
            name: profileData.name || 'Your Store',
            logoUrl: profileData.logoUrl || null,
            bannerUrl: profileData.bannerUrl || null,
            accentColor: profileData.accentColor || '#E5B35C',
            themeMode: profileData.themeMode || 'dark',
            fontFamily: profileData.fontFamily || 'font-sans',
            buttonRoundness: profileData.buttonRoundness || 'rounded-xl'
          });

          const realDbId = profileData.id;

          const menuRes = await fetch(`${API_URL}/api/vendors/${realDbId}/menu`);
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            setMenu(menuData.items && Array.isArray(menuData.items) ? menuData.items : []);
          }
  
          const promoRes = await fetch(`${API_URL}/api/vendors/${realDbId}/promos`);
          if (promoRes.ok) {
            const promoData = await promoRes.json();
            const active = promoData.promos?.find((p: any) => {
              const isNotExpired = !p.expiresAt || new Date(new Date(p.expiresAt).setHours(23, 59, 59, 999)) >= new Date();
              return p.isActive && isNotExpired;
            });

            if (active) {
              setActivePromo(active); // Save the valid promo
            } else {
              setActivePromo(null); // Force it to hide if the active promo is expired
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

  // Reset the animation sequence every time the category is tapped
  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-800 border-t-[#E5B35C] rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Crafting Menu</p>
      </div>
    );
  }

  if (!vendorProfile) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-center px-6">
        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <span className="text-4xl">🍽️</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Menu Not Found</h2>
        <p className="text-gray-500 max-w-xs">We couldn't locate this restaurant. Please scan the QR code again.</p>
      </div>
    );
  }

  const isDark = vendorProfile.themeMode === 'dark';
  const bgColor = isDark ? 'bg-[#0B0E14]' : 'bg-[#F9FAFB]';
  const cardBg = isDark ? 'bg-[#13161F]' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-800/60' : 'border-gray-200';

  const categories = ['All', ...new Set(menu.map((item) => item.category))];
  const displayedItems = activeCategory === 'All' ? menu : menu.filter(item => item.category === activeCategory);

  // 🧠 ZOMATO MATH ENGINE
  const delta = activePromo ? activePromo.minOrderValue - cartTotal : 0;
  const showNudge = cartCount > 0 && activePromo && delta > 0;

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} pb-32 ${vendorProfile.fontFamily} transition-colors duration-500 selection:bg-gray-700`}>
      
      {/* 1. CSS INJECTION: High-Performance Hardware Accelerated Keyframes */}
      <style>{`
        @keyframes cascadeUp {
          0% { opacity: 0; transform: translateY(20px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cascade-item {
          opacity: 0;
          animation: cascadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .glass-nav {
          background: ${isDark ? 'rgba(11, 14, 20, 0.7)' : 'rgba(255, 255, 255, 0.8)'};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
      `}</style>

      {/* 3. HERO SECTION: Parallax Fade */}
      <div className="relative w-full h-56 md:h-72 lg:h-80 overflow-hidden bg-gray-900">
        {vendorProfile.bannerUrl ? (
          <img src={vendorProfile.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-70 transform scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
        )}
        
        {/* The Magic Fade Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#0B0E14]' : 'from-[#F9FAFB]'} via-transparent to-transparent`} />

        {/* Floating Avatar */}
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-24 ${cardBg} rounded-full flex items-center justify-center shadow-2xl overflow-hidden ring-4 ${isDark ? 'ring-[#0B0E14]' : 'ring-[#F9FAFB]'} z-10`}>
           {vendorProfile.logoUrl ? (
             <img src={vendorProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
           ) : (
             <span className="text-4xl">🍲</span>
           )}
        </div>
      </div>

      <div className="pt-6 pb-2 flex flex-col items-center">
        <h1 className="text-3xl font-black tracking-tight">{vendorProfile.name}</h1>
      </div>
      
      {/* 4. GLASSMORPHISM NAVIGATION: Sticky Blur Effect */}
      <div className={`sticky top-0 z-40 glass-nav border-b ${borderColor} transition-all duration-300`}>
        <div className="flex overflow-x-auto px-4 py-3 space-x-2 no-scrollbar scroll-smooth">
          {categories.map(category => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-2xl whitespace-nowrap text-sm font-bold transition-all duration-300 transform active:scale-95 ${
                  isActive ? 'shadow-lg scale-100' : 'border border-transparent hover:scale-105'
                }`}
                style={{
                  backgroundColor: isActive ? vendorProfile.accentColor : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                  color: isActive ? '#0B0E14' : (isDark ? '#9CA3AF' : '#4B5563'),
                }}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. DYNAMIC FOOD GRID: Cascading Animations & Hover FX */}
      <div key={animateKey} className="p-4 flex flex-col gap-4 max-w-3xl mx-auto mt-4">
        {displayedItems.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-50 cascade-item">
             <span className="text-4xl mb-4">🍃</span>
             <p className={`text-center ${mutedText}`}>Menu items are brewing...</p>
           </div>
        ) : (
          displayedItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`cascade-item group ${cardBg} rounded-[24px] border ${borderColor} p-3 flex gap-4 transition-all duration-300 hover:shadow-xl hover:border-gray-500/30`}
              style={{ animationDelay: `${index * 60}ms` }} // Stagger math
            >
              
              {/* Image Box with subtle zoom on hover */}
              <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-3xl overflow-hidden shrink-0 relative bg-gray-100 dark:bg-gray-800/50`}>
                 {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover shrink-0 transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <span className="text-3xl opacity-50">{item.veg ? '🥗' : '🍗'}</span>
                  )}
              </div>

              <div className="flex flex-col flex-grow justify-between py-1 pr-1">
                <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg leading-tight pr-2">{item.name}</h3>
                  {/* 👈 THE MOVED INDICATOR */}
                  <div className={`w-3.5 h-3.5 rounded-full border border-gray-700 shadow-sm shrink-0 mt-1.5 ${item.veg ? 'bg-[#4ADE80]' : 'bg-[#EF4444]'}`}></div>
                </div>
                  
                  {/* 👈 THE NEW DESCRIPTION BLOCK */}
                  {item.description && (
                    <p className={`text-xs line-clamp-2 ${mutedText} leading-relaxed mb-1 pr-2`}>
                      {item.description}
                    </p>
                  )}
                  
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${mutedText} opacity-70`}>{item.prep}</p>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="font-black text-xl tracking-tight" style={{ color: vendorProfile.accentColor }}>₹{item.price}</span>
                  
                  {/* Haptic Add Button */}
                  <button 
                    onClick={() => addToCart(item)} 
                    className={`h-10 w-10 ${vendorProfile.buttonRoundness} font-black flex items-center justify-center text-xl transition-all duration-200 active:scale-75 shadow-sm`}
                    style={{ 
                      color: vendorProfile.accentColor,
                      backgroundColor: `${vendorProfile.accentColor}15`,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              
            </div>
          ))
        )}
      </div>

      {/* 6. FLOATING CHECKOUT BAR WITH ZOMATO NUDGE */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 w-full px-4 pb-6 flex flex-col items-center z-50 pointer-events-none cascade-item" style={{ animationDelay: '200ms' }}>
          <div className="w-full max-w-md pointer-events-auto relative">
            
            {/* 🚨 THE ZOMATO UPSELL NUDGE (Tucks underneath the button) */}
            {showNudge && (
              <div className="bg-[#182135] border border-[#2B3A5A] border-b-0 rounded-t-2xl px-4 pt-3 pb-6 -mb-4 flex flex-col items-center justify-center text-center shadow-[0_-10px_30px_rgba(0,0,0,0.4)] transition-all duration-300">
                <span className="text-blue-400 font-bold text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="bg-[#2B3A5A] text-blue-400 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    %
                  </span>
                  Unlock Extra {activePromo.type === 'FLAT' ? `₹${activePromo.value}` : `${activePromo.value}%`} OFF
                </span>
                <span className="text-gray-300 text-[11px] mt-1 font-medium">
                  Add items worth ₹{delta} or more to unlock
                </span>
              </div>
            )}

            {/* 🟡 YOUR EXISTING CHECKOUT BUTTON */}
            <button 
              onClick={onGoToCheckout}
              className="relative z-10 w-full font-black py-4 flex justify-between items-center px-6 transition-all active:scale-95 shadow-2xl overflow-hidden group"
              style={{ 
                backgroundColor: vendorProfile.accentColor,
                color: '#0B0E14',
                borderRadius: vendorProfile.buttonRoundness,
                boxShadow: `0 10px 25px -5px ${vendorProfile.accentColor}40`
              }}
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transform skew-x-12"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <span className="bg-[#0B0E14]/10 px-3 py-1 rounded-full text-sm">{cartCount}</span>
                <span>{cartCount === 1 ? 'Item' : 'Items'} Added</span>
              </div>
              <span className="flex items-center gap-2 relative z-10">
                Checkout <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}