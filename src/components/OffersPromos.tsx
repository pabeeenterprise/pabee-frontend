import { useState, useEffect } from 'react';

// 🌟 UPDATED: Interface now expects 'applyTo' from the database
interface Promo {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderValue: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  applyTo: string; 
}

export default function OffersPromos({ vendorId }: { vendorId: string }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // 🌟 NEW: Stores the dynamic categories
  const [isLoading, setIsLoading] = useState(true);

  // Form states matching database
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');
  const [applyTo, setApplyTo] = useState('ALL'); // 🌟 NEW: Default form state

  // 1. Fetch Promos AND Categories from Backend
  const fetchData = async () => {
    try {
      // Fetch existing promos
      const promoRes = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos`);
      if (promoRes.ok) {
        const data = await promoRes.json();
        setPromos(data.promos || []);
      }

      // 🌟 NEW: Silently fetch the menu to extract the vendor's actual categories
      const menuRes = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu-editor`);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (menuData.items) {
          const uniqueCategories = Array.from(new Set(menuData.items.map((item: any) => item.category))) as string[];
          setCategories(uniqueCategories);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchData();
  }, [vendorId]);

  // 2. Create Promo
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          type: discountType,
          value: Number(discountValue),
          minOrderValue: Number(minOrderValue),
          expiresAt: expiresAt || null,
          isActive: true,
          applyTo: applyTo // 🌟 NEW: Send the category target to Postgres
        })
      });
      
      if (res.ok) {
        // Clear form and refresh list
        setCode('');
        setDiscountValue('');
        setMinOrderValue('0');
        setExpiresAt('');
        setApplyTo('ALL');
        fetchData();
      } else {
        alert("Failed to create. This code might already exist!");
      }
    } catch (err) {
      console.error("Failed to save promo", err);
    }
  };

  // 3. Delete Promo
  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm("Delete this promo code?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      
      {/* Header Labeling */}
      <div>
        <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Offers & promotions</h1>
        <p className="text-xs text-gray-500">Create • Manage • Schedule</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* Left Side: Active Offers Management List Panel */}
        <div className="lg:col-span-5 bg-[#13161F] border border-[#1F2330] rounded-xl p-6 h-fit">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-5">Active Offers</h3>
          
          {isLoading ? (
            <p className="text-sm text-gray-500 animate-pulse">Loading offers...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {promos.length === 0 && <p className="text-xs text-gray-500 italic">No active offers yet.</p>}
              
              {promos.map(promo => (
                <div 
                  key={promo.id} 
                  className="bg-[#1A1D24] border border-[#2A2E39]/60 rounded-xl p-4 flex items-center justify-between gap-4 relative overflow-hidden"
                >
                  {/* 🌟 NEW: Visual indicator if it only applies to a specific category */}
                  {promo.applyTo !== 'ALL' && (
                    <div className="absolute top-0 right-0 bg-[#E5B35C]/20 text-[#E5B35C] text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                      {promo.applyTo} ONLY
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-blue-400 font-mono tracking-wide">{promo.code}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {promo.type === 'FLAT' ? `₹${promo.value} off` : `${promo.value}% off`} • Min Order: ₹{promo.minOrderValue}
                      {promo.expiresAt && ` • Expires: ${new Date(promo.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteOffer(promo.id)}
                    className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-all shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Create Offer Form */}
        <div className="lg:col-span-7 bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-5">Create New Offer</h3>
          
          <form onSubmit={handleCreateOffer} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Promo Code</label>
              <input 
                required
                type="text"
                placeholder="e.g. DIWALI20"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all placeholder-gray-600 uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Discount type</label>
                <select 
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all"
                >
                  <option value="PERCENTAGE">Percentage discount (%)</option>
                  <option value="FLAT">Flat amount discount (₹)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Discount value</label>
                <input 
                  required
                  type="number"
                  placeholder={discountType === 'PERCENTAGE' ? "e.g. 15" : "e.g. 50"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Min order value (₹)</label>
                <input 
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all placeholder-gray-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Expiry Date (Optional)</label>
                <input 
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all"
                />
              </div>
            </div>

            {/* 🌟 NEW: The dynamic Category Apply-To Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Apply to</label>
              <select 
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value)}
                className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">All items</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 rounded-lg text-sm hover:bg-[#d4a24b] transition-all mt-4 active:scale-[0.99]"
            >
              Create & activate offer
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}