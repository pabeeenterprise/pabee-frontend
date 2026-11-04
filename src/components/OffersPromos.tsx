import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

interface Promo {
  id: string;
  code: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  minOrderValue: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  applyTo: string;
}

interface PromoPreset {
  label: string;
  code: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  minOrderValue: number;
  applyTo: string;
}

export default function OffersPromos({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  const [promos, setPromos] = useState<Promo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Marquee Broadcast Strip States
  const [showOfferStrip, setShowOfferStrip] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [isUpdatingMarquee, setIsUpdatingMarquee] = useState(false);

  // New Promo Form States
  const [code, setCode] = useState('');
  const [type, setType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [value, setValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('100');
  const [applyTo, setApplyTo] = useState('ALL');
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Prototype Quick Presets
  const PRESETS: PromoPreset[] = [
    { label: 'Flat ₹20 Off', code: 'SAVE20', type: 'FLAT', value: 20, minOrderValue: 100, applyTo: 'ALL' },
    { label: '10% Off All Orders', code: 'TASTY10', type: 'PERCENTAGE', value: 10, minOrderValue: 0, applyTo: 'ALL' },
    { label: 'Flat ₹50 Off Big Cart', code: 'FEAST50', type: 'FLAT', value: 50, minOrderValue: 300, applyTo: 'ALL' },
    { label: '₹30 Off (Min ₹200)', code: 'CHEF30', type: 'FLAT', value: 30, minOrderValue: 200, applyTo: 'ALL' },
  ];

  // 1. Fetch Promos, Branding Strip, and Menu Categories
  const fetchPromoData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [promoRes, brandingRes, menuRes] = await Promise.all([
        fetch(`${API_URL}/api/vendors/${vendorId}/promos`, { headers }),
        fetch(`${API_URL}/api/vendors/${vendorId}/branding`, { headers }),
        fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, { headers }),
      ]);

      if (promoRes.ok) {
        const promoData = await promoRes.json();
        setPromos(promoData.promos || []);
      }

      if (brandingRes.ok) {
        const brandData = await brandingRes.json();
        if (brandData.branding) {
          setShowOfferStrip(Boolean(brandData.branding.showOfferStrip));
          setOfferText(brandData.branding.offerText || '');
        }
      }

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        const extracted = Array.from(
          new Set(
            (menuData.items || [])
              .map((i: { category: string }) => i.category?.trim())
              .filter(Boolean)
          )
        ) as string[];
        setCategories(extracted);
      }
    } catch (err) {
      console.error('Failed to load promo data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchPromoData();
  }, [vendorId]);

  // Apply a Preset to Form
  const applyPreset = (preset: PromoPreset) => {
    setCode(preset.code);
    setType(preset.type);
    setValue(preset.value.toString());
    setMinOrderValue(preset.minOrderValue.toString());
    setApplyTo(preset.applyTo);
    setShowCreateModal(true);
  };

  // 2. Save Public Marquee Broadcast Strip
  const handleSaveMarquee = async () => {
    setIsUpdatingMarquee(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/branding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          showOfferStrip,
          offerText: offerText.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to update public banner');
      toast.success(showOfferStrip ? 'Deal broadcast active on menu!' : 'Broadcast strip turned off');
    } catch {
      toast.error('Failed to update banner status');
    } finally {
      setIsUpdatingMarquee(false);
    }
  };

  // 3. Create or Update Promo
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value) {
      toast.error('Add a code and discount value');
      return;
    }

    setIsCreatingPromo(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/promos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: Number(value),
          minOrderValue: Number(minOrderValue) || 0,
          applyTo,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save offer');
      }

      toast.success(`Promo ${code.toUpperCase()} is now live!`);
      setShowCreateModal(false);
      setCode('');
      setValue('');
      setMinOrderValue('100');
      setApplyTo('ALL');
      fetchPromoData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating offer';
      toast.error(msg);
    } finally {
      setIsCreatingPromo(false);
    }
  };

  // 4. Delete Promo
  const handleDeletePromo = async (promoId: string) => {
    if (!window.confirm('Delete this promo code?')) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/promos/${promoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Promo deleted');
        setPromos((prev) => prev.filter((p) => p.id !== promoId));
      }
    } catch {
      toast.error('Failed to delete promo');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Loading active promos & discount rules…
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 text-[#F5F0E8] font-sans pb-16">
      
      {/* 1. Public Menu Deal Broadcast Marquee */}
      <div className="p-4 rounded-2xl bg-[#1C1A18] border border-[#3A352E] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Public Deal Ticker</h3>
            <p className="text-xs text-[#9A9184] mt-0.5">
              Flashes an animated ticker tape across the diner&apos;s phone
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowOfferStrip(!showOfferStrip)}
            aria-pressed={showOfferStrip}
            className="flex items-center min-h-[44px]"
          >
            <span
              className={`w-11 h-6 rounded-full relative transition-colors ${
                showOfferStrip ? 'bg-[#5CC97B]' : 'bg-[#3A352E]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  showOfferStrip ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        {showOfferStrip && (
          <div className="space-y-3 pt-2 border-t border-[#3A352E]/60 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                Marquee Announcement Text
              </label>
              <input
                type="text"
                placeholder="e.g. 🔥 Flat ₹20 OFF on all orders above ₹100! Use code SAVE20"
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] px-3.5 text-sm text-white outline-none focus:border-[#E5B35C]"
              />
            </div>

            <button
              onClick={handleSaveMarquee}
              disabled={isUpdatingMarquee}
              className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] text-xs font-bold text-[#E5B35C] hover:border-[#E5B35C] active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {isUpdatingMarquee ? 'Broadcasting…' : 'Update Menu Marquee'}
            </button>
          </div>
        )}
      </div>

      {/* 2. Quick Preset Templates */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-[#9A9184] px-1">
          Quick Deal Presets (1-Tap Creation)
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => applyPreset(p)}
              className="p-3 rounded-xl bg-[#1C1A18] border border-[#3A352E] text-left hover:border-[#E5B35C] active:scale-[0.98] transition-all"
            >
              <span className="text-xs font-bold text-[#E5B35C] block font-mono">{p.code}</span>
              <span className="text-sm font-semibold text-white block mt-0.5">{p.label}</span>
              <span className="text-[11px] text-[#9A9184] block mt-1">
                Min. cart: ₹{p.minOrderValue}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Active Promo Codes List Header */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div>
          <h3 className="text-base font-bold text-white">Active Promo Codes ({promos.length})</h3>
          <p className="text-xs text-[#9A9184]">Applied automatically or entered at checkout</p>
        </div>

        <button
          onClick={() => {
            setCode('');
            setValue('');
            setMinOrderValue('100');
            setApplyTo('ALL');
            setShowCreateModal(true);
          }}
          className="min-h-[40px] px-4 rounded-full bg-[#E5B35C] text-[#1A1206] font-bold text-xs active:scale-95 transition-transform"
        >
          + Custom Promo
        </button>
      </div>

      {/* 4. Active Promos List */}
      <div className="bg-[#1C1A18] border border-[#3A352E] rounded-2xl divide-y divide-[#3A352E] overflow-hidden shadow-sm">
        {promos.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7A7266]">
            No promo codes active. Tap a preset above or create a custom deal.
          </div>
        ) : (
          promos.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#26231F] border border-[#3A352E] text-xs font-extrabold text-[#E5B35C] font-mono tracking-wider">
                    {p.code}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {p.type === 'FLAT' ? `₹${p.value} Flat Off` : `${p.value}% Off`}
                  </span>
                </div>

                <div className="text-[11px] text-[#9A9184] mt-1">
                  Min spend: ₹{p.minOrderValue} · Target:{' '}
                  <span className="text-[#C7BFB2]">{p.applyTo === 'ALL' ? 'Entire Cart' : p.applyTo}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeletePromo(p.id)}
                className="w-9 h-9 rounded-lg border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/10 active:scale-90 transition-transform text-sm font-bold"
                aria-label={`Delete promo ${p.code}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* 5. Create / Edit Promo Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Create Promo Code</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                  Promo Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MONSOON20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] px-3.5 text-base font-bold text-[#E5B35C] font-mono outline-none focus:border-[#E5B35C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                    Discount Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'FLAT' | 'PERCENTAGE')}
                    className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] px-3 text-xs font-bold text-white outline-none focus:border-[#E5B35C]"
                  >
                    <option value="FLAT">Flat Cash Off (₹)</option>
                    <option value="PERCENTAGE">Percentage Off (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                    {type === 'FLAT' ? 'Amount (₹) *' : 'Discount (%) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={type === 'FLAT' ? '20' : '10'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] px-3 text-base font-bold text-white outline-none focus:border-[#E5B35C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                    Min. Cart Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] px-3 text-sm text-white outline-none focus:border-[#E5B35C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                    Target Category
                  </label>
                  <select
                    value={applyTo}
                    onChange={(e) => setApplyTo(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#26231F] border border-[#3A352E] px-3 text-xs font-semibold text-[#C7BFB2] outline-none focus:border-[#E5B35C]"
                  >
                    <option value="ALL">Entire Cart</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c} Only
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingPromo}
                className="w-full h-12 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50 mt-2"
              >
                {isCreatingPromo ? 'Activating Deal…' : 'Activate Promo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}