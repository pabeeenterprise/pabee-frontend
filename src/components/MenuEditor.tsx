import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase'; // 👈 MAKE SURE THIS PATH MATCHES YOUR SETUP

// Define the shape of your data based on your Prisma schema
type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
  available: boolean;
  imageUrl?: string | null; // 👈 ADDED IMAGE URL TYPE
};

export default function MenuEditor({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for new items
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food');
  const [price, setPrice] = useState('');
  const [prep, setPrep] = useState('10 min');
  const [veg, setVeg] = useState(true);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Menu Data
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`);
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

  // 👇 NEW: Safe File Selection Handler (2MB Limit)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      e.target.value = ''; // Reset the input
      return;
    }
    
    setImageFile(file);
  };

  // 2. Add New Item (UPGRADED WITH UPLOAD LOGIC)
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let finalImageUrl = null;
    
    try {
      // Step A: Upload Image to Supabase FIRST
      if (imageFile) {
        setIsUploadingImage(true);
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${vendorId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-items')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error("Supabase Upload Error:", uploadError);
          throw new Error("Failed to upload image to bucket");
        }

        const { data } = supabase.storage
          .from('menu-items')
          .getPublicUrl(fileName);
          
        finalImageUrl = data.publicUrl;
        setIsUploadingImage(false);
      }

      // Step B: Send all data to Render backend
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          category, 
          price: Number(price), 
          prep, 
          veg, 
          available: true,
          imageUrl: finalImageUrl // 👈 SENDING URL TO BACKEND
        }),
      });

      if (res.ok) {
        toast.success("Item added to menu!");
        fetchMenu(); 
        
        // Clear the form
        setName('');
        setPrice('');
        setPrep('10 min');
        setImageFile(null);
        // Reset file input element visually
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

  // 3. Toggle Availability
  const toggleAvailable = async (itemId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  // 4. Delete Item
  const deleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success("Item deleted");
        setItems(items.filter(item => item.id !== itemId));
      }
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading menu...</div>;

  return (
    <div className="p-8 max-w-5xl font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-[#E5B35C] mb-2">Menu Editor</h2>
        <p className="text-sm text-gray-400">Add new dishes, update prices, and manage stock.</p>
      </div>

      {/* --- ADD ITEM FORM --- */}
      <form onSubmit={handleAddItem} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl mb-8">
        <h3 className="text-lg font-bold text-gray-200 mb-4">Add New Item</h3>
        
        {/* 👇 TOP ROW: Image Upload */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Photo (Optional, Max 2MB)</label>
          <input 
            id="image-upload"
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="w-full bg-[#0B0E14] border border-gray-700 text-gray-400 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#E5B35C] file:text-[#0B0E14] hover:file:bg-[#d4a24b] cursor-pointer" 
          />
        </div>

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

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving || isUploadingImage} className="bg-[#E5B35C] text-[#0B0E14] font-bold py-2 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50">
            {isUploadingImage ? 'Uploading Image...' : isSaving ? 'Saving...' : '+ Add Item'}
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
                    {/* 👇 DISPLAY THUMBNAIL IF IT EXISTS */}
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-md border border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-800 rounded-md flex items-center justify-center text-xs text-gray-500">No Img</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]">{item.veg ? '🟢' : '🔴'}</span>
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{item.category}</td>
                  <td className="p-4 text-sm text-[#E5B35C] font-bold">₹{item.price}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleAvailable(item.id, item.available)}
                      className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${item.available ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                    >
                      {item.available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
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
    </div>
  );
}