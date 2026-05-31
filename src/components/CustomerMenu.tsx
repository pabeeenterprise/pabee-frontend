import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
}

export default function CustomerMenu({ vendorId, onGoToCheckout }: { vendorId: string, onGoToCheckout: () => void }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const { addToCart, cartCount } = useCart();
  
  // Promo state
  const [activePromoBanner, setActivePromoBanner] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuAndPromos = async () => {
      try {
        // 1. Fetch the Food Menu (Restored!)
        const menuRes = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu`);
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          // Depending on your backend, it might be in { menu: [...] } or just an array
          setMenu(menuData.menu || []);
        }

        // 2. Fetch Active Promos
        const promoRes = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos`);
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

    fetchMenuAndPromos();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <p className="font-medium text-gray-400 animate-pulse">Loading menu...</p>
      </div>
    );
  }

  const categories = ['All', ...new Set(menu.map((item) => item.category))];
  const displayedItems = activeCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 pb-24 font-sans">
      
      {/* --- PROMO BANNER (Exactly here at the top!) --- */}
      {activePromoBanner && (
        <div className="bg-[#E55B3C] text-white text-xs font-bold text-center py-2 px-4 shadow-md tracking-wide">
          {activePromoBanner}
        </div>
      )}

      {/* Header & Sticky Category Bar */}
      <div className="sticky top-0 bg-[#121212]/95 backdrop-blur-md border-b border-gray-800 z-10 shadow-lg">
        <div className="p-4 flex flex-col items-center border-b border-gray-800/50">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2 shadow-inner border border-gray-700">
             <span className="text-3xl">🍲</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Spice Street Chaat</h1>
          <p className="text-sm text-gray-400 mt-1">Famous for Speed & Spice</p>
        </div>
        
        {/* Horizontal Scroll Categories */}
        <div className="flex overflow-x-auto px-4 py-3 space-x-3 no-scrollbar">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                activeCategory === category 
                  ? 'bg-[#E55B3C] text-white shadow-[0_0_10px_rgba(229,91,60,0.3)]' 
                  : 'bg-transparent text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
        {displayedItems.length === 0 ? (
           <p className="text-center text-gray-500 my-10">No items available in this category.</p>
        ) : (
          displayedItems.map(item => (
            <div key={item.id} className="bg-[#1A1A1A] rounded-2xl border border-gray-800 p-4 flex gap-4 transition-transform active:scale-[0.98]">
              
              {/* Details Section */}
              <div className="flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {/* Veg Tag */}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      item.veg ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'
                    }`}>
                      {item.veg ? 'Veg' : 'Non-Veg'}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-gray-100 text-lg">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.prep}</p>
                </div>
                
                <div className="flex items-center mt-4">
                  <span className="font-bold text-[#E55B3C] text-lg">₹{item.price}</span>
                </div>
              </div>

              {/* Right Side: Image Placeholder & Button */}
              <div className="flex flex-col items-end justify-between shrink-0">
                 <div className="w-20 h-20 bg-gray-800/50 rounded-xl flex items-center justify-center text-3xl mb-2 border border-gray-700/50">
                   {/* Fallback emojis based on veg status */}
                   {item.veg ? '🥗' : '🍗'}
                 </div>
                 
                 <button 
                  onClick={() => addToCart(item)} 
                  className="bg-[#E55B3C]/10 text-[#E55B3C] border border-[#E55B3C]/30 h-8 w-8 rounded-lg font-bold flex items-center justify-center text-xl hover:bg-[#E55B3C] hover:text-white transition-colors"
                 >
                  +
                 </button>
              </div>
              
            </div>
          ))
        )}
      </div>

      {/* Floating Checkout Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)] z-50">
          <button 
            onClick={onGoToCheckout}
            className="w-full bg-[#E55B3C] text-white font-bold py-3.5 rounded-xl flex justify-between px-6 hover:bg-[#D44A2B] transition-colors"
          >
            <span>{cartCount} {cartCount === 1 ? 'Item' : 'Items'}</span>
            <span className="flex items-center gap-2">View Cart <span className="text-xl">→</span></span>
          </button>
        </div>
      )}

    </div>
  );
}