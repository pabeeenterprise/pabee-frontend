import { useState } from 'react';

interface Offer {
  id: string;
  code: string;
  description: string;
  active: boolean;
}

export default function OffersPromos() {
  // Initial state mimicking the platform records from your configuration sequence
  const [offers, setOffers] = useState<Offer[]>([
    { id: '1', code: 'HAPPYHOUR', description: '15% off all Chaat • 6–8 PM daily', active: true },
    { id: '2', code: 'WELCOME10', description: '₹10 off first order • All day', active: true },
    { id: '3', code: 'WEEKEND20', description: '20% off Fri–Sun • Weekend', active: false },
  ]);

  // Form states
  const [discountType, setDiscountType] = useState('Percentage discount (%)');
  const [discountValue, setDiscountValue] = useState('');
  const [applyTo, setApplyTo] = useState('All items');
  const [validFrom, setValidFrom] = useState('18:00');
  const [validUntil, setValidUntil] = useState('20:00');

  const handleToggleOffer = (id: string) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, active: !o.active } : o));
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountValue) return;

    // Generate a quick mock code configuration based on value input
    const generatedCode = `DISCOUNT${discountValue}`;
    const newOffer: Offer = {
      id: Date.now().toString(),
      code: generatedCode,
      description: `${discountValue}% off • Applied to ${applyTo.toLowerCase()} (${validFrom}-${validUntil})`,
      active: true
    };

    setOffers(prev => [...prev, newOffer]);
    setDiscountValue(''); // Clear form input value
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      
      {/* Header Labeling */}
      <div>
        <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Offers & promotions</h1>
        <p className="text-xs text-gray-500">Create • Toggle • Schedule</p>
      </div>

      {/* Main Structural Control Layout Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* Left Side: Active Offers Management List Panel */}
        <div className="lg:col-span-5 bg-[#13161F] border border-[#1F2330] rounded-xl p-6 h-fit">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-5">Active Offers</h3>
          
          <div className="flex flex-col gap-3">
            {offers.map(offer => (
              <div 
                key={offer.id} 
                className="bg-[#1A1D24] border border-[#2A2E39]/60 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-blue-400 font-mono tracking-wide">{offer.code}</h4>
                  <p className="text-xs text-gray-400 mt-1">{offer.description}</p>
                </div>

                {/* Inline Toggle Component Switch mechanics */}
                <button
                  onClick={() => handleToggleOffer(offer.id)}
                  className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-all duration-300 shrink-0 ${
                    offer.active ? 'bg-[#4ADE80]' : 'bg-gray-700'
                  }`}
                >
                  <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all duration-300 ${
                    offer.active ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Create Offer Interactive Submission Form Engine */}
        <div className="lg:col-span-7 bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-5">Create New Offer</h3>
          
          <form onSubmit={handleCreateOffer} className="flex flex-col gap-4">
            
            {/* Input Selection Block 1 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Discount type</label>
              <select 
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all"
              >
                <option>Percentage discount (%)</option>
                <option>Flat amount discount (₹)</option>
              </select>
            </div>

            {/* Value Entry Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Discount value (e.g. 15 for 15%)</label>
              <input 
                type="number"
                placeholder="15"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all placeholder-gray-600"
              />
            </div>

            {/* Scoping Filter Select block */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Apply to</label>
              <select 
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value)}
                className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all"
              >
                <option>All items</option>
                <option>Chaat items only</option>
                <option>Drinks only</option>
              </select>
            </div>

            {/* Dual Column Time Scheduling Range Row controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Valid from</label>
                <input 
                  type="time"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Valid until</label>
                <input 
                  type="time"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-[#1A1D24] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#E5B35C] transition-all"
                />
              </div>
            </div>

            {/* Submit Mechanism Button Trigger */}
            <button 
              type="submit"
              className="w-full bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 rounded-lg text-sm hover:bg-[#d4a24b] transition-all mt-2 active:scale-[0.99]"
            >
              Create & activate offer
            </button>

          </form>
        </div>

      </div>

    </div>
  );
}