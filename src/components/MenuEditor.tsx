import { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
  available?: boolean; // Optional flag for toggling
}

export default function MenuEditor({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('items');

  // Fetch your live menu data
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu`);
        if (res.ok) {
          const data = await res.json();
          // Initialize items with a default true availability state if not present
          const processedItems = data.items.map((item: MenuItem) => ({
            ...item,
            available: item.available !== false
          }));
          setItems(processedItems);
        }
      } catch (err) {
        console.error("Failed to fetch menu for editor", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [vendorId]);

  // Handler to toggle an item's live visibility state locally
  const handleToggleVisibility = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, available: !item.available } : item
      )
    );
  };

  if (loading) return <div className="text-gray-400 animate-pulse">Loading menu configurations...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      
      {/* Top Banner Control Row */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Menu editor</h1>
          <p className="text-xs text-gray-500">Add • Edit • Toggle visibility • Manage sections</p>
        </div>
        <button className="bg-[#E5B35C] text-[#0B0E14] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#d4a24b] transition-colors shadow-sm">
          + Add item
        </button>
      </div>

      {/* Editor Sub-Tabs Layout */}
      <div className="flex gap-4 border-b border-[#1F2330] pb-2 text-sm font-medium">
        <button 
          onClick={() => setActiveSubTab('items')}
          className={`pb-2 px-1 transition-all ${activeSubTab === 'items' ? 'text-[#E5B35C] border-b-2 border-[#E5B35C]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Items
        </button>
        <button 
          onClick={() => setActiveSubTab('sections')}
          className={`pb-2 px-1 transition-all ${activeSubTab === 'sections' ? 'text-[#E5B35C] border-b-2 border-[#E5B35C]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Sections
        </button>
        <button 
          onClick={() => setActiveSubTab('hours')}
          className={`pb-2 px-1 transition-all ${activeSubTab === 'hours' ? 'text-[#E5B35C] border-b-2 border-[#E5B35C]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Hours & status
        </button>
      </div>

      {/* Main Configurations Rendering Panel */}
      {activeSubTab === 'items' && (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div 
              key={item.id} 
              className="bg-[#13161F] border border-[#1F2330] rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-[#2A2E39] transition-all"
            >
              {/* Product Info Description Layout */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1A1D24] rounded-lg border border-[#2A2E39] flex items-center justify-center text-xl">
                  {item.category === 'Drinks' ? '☕' : item.category === 'Snacks' ? '🍿' : '🍛'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{item.category} • ₹{item.price}</p>
                </div>
              </div>

              {/* Dynamic Availability Actions Mechanics */}
              <div className="flex items-center gap-6">
                
                {/* Active Indicator Badge pill */}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  item.available 
                    ? 'bg-[#1C3A27] text-[#4ADE80] border border-[#4ADE80]/20' 
                    : 'bg-[#3A1C1C] text-[#F87171] border border-[#F87171]/20'
                }`}>
                  {item.available ? 'Active' : 'Hidden'}
                </span>

                {/* Custom Toggle Control Implementation */}
                <button
                  onClick={() => handleToggleVisibility(item.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                    item.available ? 'bg-[#4ADE80]' : 'bg-gray-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                    item.available ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>

                {/* Edit Action Button triggers */}
                <button className="px-3 py-1 bg-transparent border border-gray-700 text-gray-400 rounded-lg text-xs hover:text-white hover:border-gray-500 transition-colors">
                  Edit
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Basic fallbacks for unbuilt submenu tabs */}
      {activeSubTab !== 'items' && (
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-8 text-center text-gray-500 text-sm">
          Section layout schema controls coming soon.
        </div>
      )}

    </div>
  );
}