import { useState, useEffect } from 'react';

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
}

export default function Offers({ vendorId }: { vendorId: string }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    type: 'FLAT',
    value: '',
    minOrderValue: '0',
    maxUses: '',
    expiresAt: ''
  });

  const fetchPromos = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos`);
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promos || []);
      }
    } catch (err) {
      console.error("Failed to fetch promos", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [vendorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isActive: true
        })
      });
      
      if (res.ok) {
        setIsFormOpen(false);
        setFormData({ code: '', type: 'FLAT', value: '', minOrderValue: '0', maxUses: '', expiresAt: '' });
        fetchPromos();
      } else {
        alert("Failed to create. Code might already exist!");
      }
    } catch (err) {
      console.error("Failed to save promo", err);
    }
  };

  const deletePromo = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promo code?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/promos/${id}`, { method: 'DELETE' });
      fetchPromos();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  if (isLoading) return <div className="p-10 text-gray-500 animate-pulse">Loading promos...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Offers & Promos</h2>
          <p className="text-sm text-gray-500">Create discount codes to boost your sales.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-[#E5B35C] text-[#0B0E14] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#d4a24b] transition-all"
        >
          {isFormOpen ? 'Cancel' : '+ Create Promo Code'}
        </button>
      </div>

      {/* --- CREATE PROMO FORM --- */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-[#13161F] border border-[#1F2330] p-6 rounded-xl mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Promo Code</label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C] uppercase" placeholder="e.g. DIWALI50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Discount Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]">
                <option value="FLAT">Flat Amount (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Discount Value</label>
              <input required type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" placeholder={formData.type === 'FLAT' ? 'e.g. 50' : 'e.g. 15'} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Order Value (₹)</label>
              <input required type="number" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" placeholder="e.g. 300" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Uses (Optional)</label>
              <input type="number" value={formData.maxUses} onChange={e => setFormData({...formData, maxUses: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" placeholder="Leave blank for unlimited" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Expiry Date (Optional)</label>
              <input type="date" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-[#E5B35C] text-[#0B0E14] px-6 py-2 rounded-lg font-bold text-sm">Save Code</button>
          </div>
        </form>
      )}

      {/* --- PROMOS LIST --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promos.map((promo) => (
          <div key={promo.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-white tracking-wider">{promo.code}</h3>
                <p className="text-[#E5B35C] font-bold text-sm mt-1">
                  {promo.type === 'FLAT' ? `₹${promo.value} OFF` : `${promo.value}% OFF`}
                </p>
              </div>
              <button onClick={() => deletePromo(promo.id)} className="text-red-500 hover:text-red-400 bg-red-500/10 px-2 py-1 rounded text-xs">Delete</button>
            </div>

            <div className="space-y-2 text-xs text-gray-400">
              <p>• Min Order: <span className="text-gray-200">₹{promo.minOrderValue}</span></p>
              <p>• Uses: <span className="text-gray-200">{promo.currentUses} / {promo.maxUses || '∞'}</span></p>
              {promo.expiresAt && <p>• Expires: <span className="text-gray-200">{new Date(promo.expiresAt).toLocaleDateString()}</span></p>}
            </div>
          </div>
        ))}
        {promos.length === 0 && !isFormOpen && (
          <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-xl">
            No promo codes active yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}