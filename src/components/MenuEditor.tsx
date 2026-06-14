import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase'; 
import { useAuth } from '@clerk/clerk-react'; 

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
  available: boolean;
  imageUrl?: string | null;
  description?: string;
  costPrice?: number;
  emoji?: string;
  remarks?: string;
  badgeLabel?: string;
};

export default function MenuEditor({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for basic item details
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food');
  const [price, setPrice] = useState('');
  const [prep, setPrep] = useState('10 min');
  const [veg, setVeg] = useState(true);

  // 🌟 NEW: Form State for expanded configuration fields
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [emoji, setEmoji] = useState('');
  const [badgeLabel, setBadgeLabel] = useState('');
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const { getToken } = useAuth();

  const fetchMenu = async () => {
    try {
      const token = await getToken(); 
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, {
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (error) {
      toast.error("Failed to load menu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchMenu();
  }, [vendorId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      e.target.value = ''; 
      return;
    }
    setImageFile(file);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let finalImageUrl = null;
    
    try {
      if (imageFile) {
        setIsUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${vendorId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('menu-items')
          .upload(fileName, imageFile);

        if (uploadError) throw new Error("Failed to upload image");
        const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
        setIsUploadingImage(false);
      }

      const token = await getToken(); 
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        // 🌟 NEW: Inject expanded fields into the creation payload
        body: JSON.stringify({ 
          name, 
          category, 
          price: Number(price), 
          prep, 
          veg, 
          available: true, 
          imageUrl: finalImageUrl,
          description: description || null,
          costPrice: costPrice ? Number(costPrice) : null,
          remarks: remarks || null,
          emoji: emoji || null,
          badgeLabel: badgeLabel || null
        }),
      });

      if (res.ok) {
        toast.success("Item added to menu!");
        fetchMenu(); 
        
        // 🌟 NEW: Wipe all state fields clean after successful save
        setName(''); setPrice(''); setPrep('10 min'); setImageFile(null);
        setDescription(''); setCostPrice(''); setRemarks(''); setEmoji(''); setBadgeLabel('');
        
        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error("Failed to save to database");
      }
    } catch (error: any) {
      toast.error(error.message || "Error adding item");
      setIsUploadingImage(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSaving(true);

    try {
      let finalImageUrl = editingItem.imageUrl;

      if (imageFile) {
        setIsUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${vendorId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('menu-items')
          .upload(fileName, imageFile);

        if (uploadError) throw new Error("Image upload mismatch");
        const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
        setIsUploadingImage(false);
      }

      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${editingItem.id}`, {
        method: 'PATCH', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editingItem,
          price: Number(editingItem.price),
          costPrice: editingItem.costPrice ? Number(editingItem.costPrice) : null,
          imageUrl: finalImageUrl
        })
      });

      if (res.ok) {
        toast.success("Menu configuration synchronized!");
        setEditingItem(null);
        setImageFile(null);
        fetchMenu();
      } else {
        throw new Error("Backend synchronization error");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update target item");
      setIsUploadingImage(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAvailable = async (itemId: string, currentStatus: boolean) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ available: !currentStatus }),
      });

      if (res.ok) {
        toast.success(currentStatus ? "Marked Out of Stock" : "Marked In Stock");
        setItems(items.map(item => item.id === itemId ? { ...item, available: !currentStatus } : item));
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Item deleted");
        setItems(items.filter(item => item.id !== itemId));
        setEditingItem(null); 
      }
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400 animate-pulse">Loading menu configuration context...</div>;

  return (
    <div className="p-8 max-w-5xl font-sans relative">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-[#E5B35C] mb-2">Menu Editor</h2>
        <p className="text-sm text-gray-400">Add new dishes, update prices, and manage stock.</p>
      </div>

      {/* --- ADD ITEM FORM --- */}
      <form onSubmit={handleAddItem} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl mb-8">
        <h3 className="text-lg font-bold text-gray-200 mb-4">Add New Item</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Tandoori Roti" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price (₹)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="1" placeholder="0" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prep Time</label>
            <input type="text" value={prep} onChange={(e) => setPrep(e.target.value)} required placeholder="e.g. 10 min" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none">
              <option>Food</option>
              <option>Snacks</option>
              <option>Drinks</option>
              <option>Dessert</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
            <select value={veg ? "veg" : "non-veg"} onChange={(e) => setVeg(e.target.value === "veg")} className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none">
              <option value="veg">🟢 Veg</option>
              <option value="non-veg">🔴 Non-Veg</option>
            </select>
          </div>
        </div>

        {/* 🌟 NEW: Expanded Creation Fields UI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Rich buttery bhaji with soft pavs" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cost Price (₹)</label>
            <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g. 28" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Emoji</label>
            <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🍛" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Remarks</label>
            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Regular spicy, Less spicy" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Badge Label</label>
            <input type="text" value={badgeLabel} onChange={(e) => setBadgeLabel(e.target.value)} placeholder="e.g. Best Seller" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-[#1F2330] pt-4">
          <div className="w-full md:w-1/2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Photo (Optional)</label>
            <input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-[#0B0E14] border border-gray-700 text-gray-400 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#E5B35C] file:text-[#0B0E14] hover:file:bg-[#d4a24b] cursor-pointer" />
          </div>
          <button type="submit" disabled={isSaving || isUploadingImage} className="w-full md:w-auto bg-[#E5B35C] text-[#0B0E14] font-bold py-3 px-8 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50 mt-4 md:mt-6">
            {isUploadingImage ? 'Uploading...' : isSaving ? 'Saving...' : '+ Add Item'}
          </button>
        </div>
      </form>

      {/* --- LIVE MENU LIST --- */}
      <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B0E14] border-b border-[#1F2330] text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-4 w-16">Image</th>
              <th className="p-4">Item</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2330]">
            {items.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No items on the menu yet.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-[#1a1f2b] transition-colors">
                  <td className="p-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-md border border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-800 rounded-md flex items-center justify-center text-xs text-gray-500">{item.emoji || 'No Img'}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]">{item.veg ? '🟢' : '🔴'}</span>
                      <span className="text-white font-medium">{item.name}</span>
                      {item.badgeLabel && <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold">{item.badgeLabel}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{item.category}</td>
                  <td className="p-4 text-sm text-[#E5B35C] font-bold">₹{item.price}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleAvailable(item.id, item.available)} className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${item.available ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
                      {item.available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-3 items-center">
                    <button onClick={() => setEditingItem(item)} className="text-sm text-[#E5B35C] hover:underline font-medium">
                      Edit
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-sm text-gray-500 hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- EDIT MODAL --- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C120C] border border-[#2F2117] text-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-up">
            
            <div className="p-5 border-b border-[#2F2117] flex justify-between items-center bg-[#150D09]">
              <h3 className="text-xl font-serif text-white font-bold">Edit: {editingItem.name}</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5">×</button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Name</label>
                <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} required className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Description</label>
                <input type="text" value={editingItem.description || ''} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="Rich buttery bhaji with soft pavs" className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Selling price (₹)</label>
                  <input type="number" value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })} required className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Cost price (₹) — <span className="text-[10px] text-gray-500 lowercase">for margin</span></label>
                  <input type="number" value={editingItem.costPrice || ''} onChange={(e) => setEditingItem({ ...editingItem, costPrice: Number(e.target.value) })} placeholder="e.g. 28" className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Category</label>
                <select value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm">
                  <option value="Food">Food</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Emoji <span className="text-[10px] text-gray-500 lowercase">(shown if no image)</span></label>
                <input type="text" value={editingItem.emoji || ''} onChange={(e) => setEditingItem({ ...editingItem, emoji: e.target.value })} placeholder="🍛" className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Item image <span className="text-[10px] text-gray-500 lowercase">(optional)</span></label>
                <div className="border border-dashed border-[#3E291C] bg-[#130B07] rounded-xl p-4 text-center cursor-pointer hover:border-[#E5B35C]/50 transition-colors relative">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <p className="text-xs text-gray-400">📷 {imageFile ? imageFile.name : editingItem.imageUrl ? 'Image exists. Click to change' : 'Click to upload new snapshot'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Remarks <span className="text-[10px] text-gray-500 lowercase">(comma separated)</span></label>
                <input type="text" value={editingItem.remarks || ''} onChange={(e) => setEditingItem({ ...editingItem, remarks: e.target.value })} placeholder="Regular spicy, Less spicy" className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Badge label <span className="text-[10px] text-gray-500 lowercase">(optional)</span></label>
                <input type="text" value={editingItem.badgeLabel || ''} onChange={(e) => setEditingItem({ ...editingItem, badgeLabel: e.target.value })} placeholder="e.g. Best Seller" className="w-full bg-[#130B07] border border-[#3E291C] rounded-xl p-3 text-white outline-none focus:border-[#E5B35C] text-sm" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2F2117]">
                <span className="text-sm font-medium text-gray-300">Active / visible</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editingItem.available} onChange={(e) => setEditingItem({ ...editingItem, available: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex justify-between gap-4 pt-4">
                <button type="submit" disabled={isSaving || isUploadingImage} className="flex-1 bg-red-700 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors text-sm shadow-md disabled:opacity-50">
                  {isUploadingImage ? 'Uploading Image...' : isSaving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => deleteItem(editingItem.id)} className="px-5 border border-red-900/40 text-red-400 rounded-xl text-sm font-medium hover:bg-red-950/20 transition-colors">
                  Delete
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}