import { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
  available: boolean;
}

export default function MenuEditor({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'Food', price: '', veg: true, available: true
  });

  // 1. Fetch Menu
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu-editor`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch menu", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [vendorId]);

  // 2. Handle Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId 
      ? `${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu/${editingId}`
      : `${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu`;
      
    const method = editingId ? 'PATCH' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price) // Ensure price is a number
        })
      });
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: '', category: 'Food', price: '', veg: true, available: true });
      fetchMenu(); // Refresh the list
    } catch (err) {
      console.error("Failed to save item", err);
    }
  };

  // 3. Quick Toggle Availability (In Stock / Out of Stock)
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !currentStatus })
      });
      fetchMenu();
    } catch (err) {
      console.error("Failed to toggle availability", err);
    }
  };

  // 4. Delete Item
  const deleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/menu/${id}`, { method: 'DELETE' });
      fetchMenu();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  // 5. Open Form for Editing
  const handleEditClick = (item: MenuItem) => {
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      veg: item.veg,
      available: item.available
    });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  if (isLoading) return <div className="p-10 text-gray-500 animate-pulse">Loading menu...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Menu Editor</h2>
          <p className="text-sm text-gray-500">Manage your items, prices, and availability.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', category: 'Food', price: '', veg: true, available: true });
            setIsFormOpen(!isFormOpen);
          }}
          className="bg-[#E5B35C] text-[#0B0E14] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#d4a24b] transition-all"
        >
          {isFormOpen ? 'Close Form' : '+ Add New Item'}
        </button>
      </div>

      {/* --- ADD / EDIT FORM --- */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-[#13161F] border border-[#1F2330] p-6 rounded-xl mb-8 shadow-lg">
          <h3 className="text-white font-bold mb-4">{editingId ? 'Edit Item' : 'Add New Item'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Item Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" placeholder="e.g. Garlic Naan" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Price (₹)</label>
              <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" placeholder="e.g. 150" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5B35C]" placeholder="e.g. Starters, Mains, Drinks" />
            </div>
            <div className="flex items-center gap-4 mt-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={formData.veg} onChange={e => setFormData({...formData, veg: e.target.checked})} className="accent-green-500 w-4 h-4" />
                Pure Veg
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="bg-[#E5B35C] text-[#0B0E14] px-6 py-2 rounded-lg font-bold text-sm">{editingId ? 'Save Changes' : 'Create Item'}</button>
          </div>
        </form>
      )}

      {/* --- MENU LIST --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`bg-[#13161F] border ${item.available ? 'border-[#1F2330]' : 'border-red-900/30 opacity-75'} rounded-xl p-5 flex flex-col justify-between transition-all`}>
            
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full border-2 ${item.veg ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20'}`}></span>
                  <h3 className="text-lg font-bold text-white">{item.name}</h3>
                </div>
                <p className="text-[#E5B35C] font-bold">₹{item.price}</p>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">{item.category}</p>
            </div>

            <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
              <button 
                onClick={() => toggleAvailability(item.id, item.available)}
                className={`text-xs px-3 py-1.5 rounded font-bold ${item.available ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
              >
                {item.available ? '🟢 In Stock' : '🔴 Out of Stock'}
              </button>
              
              <div className="flex gap-2">
                <button onClick={() => handleEditClick(item)} className="text-gray-400 hover:text-white px-2 py-1 text-sm bg-[#1F2330] rounded">Edit</button>
                <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300 px-2 py-1 text-sm bg-red-900/20 rounded">Delete</button>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}