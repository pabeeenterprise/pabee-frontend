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
  remarks?: string;
  badgeLabel?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  unit: 'g' | 'ml' | 'pcs';
  currentStock: number;
  minAlert: number;
  costPerUnit: number;
};

type RecipeIngredient = {
  inventoryItemId: string;
  quantityUsed: number;
};

export default function MenuEditor({ vendorId }: { vendorId: string }) {
  // 🧭 TAB NAVIGATION STATE
  const [activeTab, setActiveTab] = useState<'dishes' | 'inventory'>('dishes');
  const [showAddModal, setShowAddModal] = useState(false);

  // DISH STATE
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for dishes
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food');
  const [price, setPrice] = useState('');
  const [prep, setPrep] = useState('10 min');
  const [veg, setVeg] = useState(true);
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [badgeLabel, setBadgeLabel] = useState('');
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 📦 RAW INVENTORY STATE
  const [rawItems, setRawItems] = useState<InventoryItem[]>([]);
  const [rawName, setRawName] = useState('');
  const [rawUnit, setRawUnit] = useState<'g' | 'ml' | 'pcs'>('pcs');
  const [rawStock, setRawStock] = useState('');
  const [rawAlert, setRawAlert] = useState('10');
  const [rawCost, setRawCost] = useState('');
  const [isSavingRaw, setIsSavingRaw] = useState(false);

  // 🔗 RECIPE BUILDER MODAL STATE
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const { getToken } = useAuth();

  // 1. Fetch Dishes
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

  // 2. Fetch Raw Inventory
  const fetchInventory = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRawItems(data.items || []);
      }
    } catch (error) {
      toast.error("Failed to load inventory stock");
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchMenu();
      fetchInventory();
    }
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

  // --- DISH ACTIONS ---
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
          badgeLabel: badgeLabel || null
        }),
      });

      if (res.ok) {
        toast.success("Item added to menu!");
        setShowAddModal(false);
        fetchMenu(); 
        setName(''); setPrice(''); setPrep('10 min'); setImageFile(null);
        setDescription(''); setCostPrice(''); setRemarks(''); setBadgeLabel('');
        
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
        toast.success("Menu updated!");
        setEditingItem(null);
        setImageFile(null);
        fetchMenu();
      } else {
        throw new Error("Backend synchronization error");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
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

  // --- 📦 RAW INVENTORY ACTIONS ---
  const handleAddRawItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawName.trim()) return toast.error("Provide an item name");
    setIsSavingRaw(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/inventory`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: rawName,
          unit: rawUnit,
          currentStock: Number(rawStock) || 0,
          minAlert: Number(rawAlert) || 0,
          costPerUnit: Number(rawCost) || 0
        })
      });

      if (res.ok) {
        toast.success("Stock registered in pantry");
        setRawName('');
        setRawStock('');
        setRawCost('');
        fetchInventory();
      } else {
        toast.error("Failed to register stock item");
      }
    } catch (err) {
      toast.error("Network error adding stock");
    } finally {
      setIsSavingRaw(false);
    }
  };

  // --- 🔗 RECIPE BUILDER ACTIONS ---
  const openRecipeModal = async (dish: MenuItem) => {
    setRecipeItem(dish);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${dish.id}/recipe`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecipeIngredients(
          data.recipe?.map((r: any) => ({
            inventoryItemId: r.inventoryItemId,
            quantityUsed: r.quantityUsed
          })) || []
        );
      }
    } catch (err) {
      setRecipeIngredients([]);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipeItem) return;
    setIsSavingRecipe(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${recipeItem.id}/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ingredients: recipeIngredients })
      });

      if (res.ok) {
        toast.success("Recipe mapped to stock!");
        setRecipeItem(null);
      } else {
        toast.error("Failed to link ingredients");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400 animate-pulse">Loading menu configuration...</div>;

  return (
    <div className="p-8 max-w-5xl font-sans relative">
      
      {/* HEADER & SUB-TABS */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-3xl font-serif text-[#E5B35C] mb-1">Menu & Stock Manager</h2>
          <p className="text-xs text-gray-400">Manage customer-facing items and underlying raw inventory.</p>
        </div>

        {/* 🌟 SUB-TAB SWITCH */}
        <div className="flex bg-[#13161F] p-1 rounded-xl border border-[#1F2330]">
          <button 
            onClick={() => setActiveTab('dishes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dishes' 
                ? 'bg-[#E5B35C] text-black shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🍳 Dish Catalog ({items.length})
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inventory' 
                ? 'bg-[#E5B35C] text-black shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📦 Raw Stock / Pantry ({rawItems.length})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🍳 VIEW 1: DISH CATALOG (Table First, Form in Modal)           */}
      {/* ============================================================== */}
      {activeTab === 'dishes' && (
        <div className="flex flex-col gap-4">
          
          {/* TOP ACTION BAR */}
          <div className="flex justify-between items-center bg-[#13161F] border border-[#1F2330] p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Dishes</h3>
              <p className="text-xs text-gray-500">Showing {items.length} items configured on your counter</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#E5B35C] hover:bg-[#d4a24b] text-[#0B0E14] font-black text-xs px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-lg"
            >
              + Add New Dish
            </button>
          </div>

          {/* --- LIVE MENU LIST (NOW AT THE TOP) --- */}
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
                          <div className="w-10 h-10 bg-gray-800 rounded-md flex items-center justify-center text-lg opacity-50">
                            {item.veg ? '🥗' : '🍗'}
                          </div>
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
                        <button onClick={() => openRecipeModal(item)} className="text-xs bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 px-2.5 py-1 rounded-md border border-gray-700 transition-colors">
                          🔗 Recipe
                        </button>
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

          {/* --- ADD DISH POPUP MODAL (HIDDEN BY DEFAULT) --- */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#13161F] border border-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-white">Add New Dish</h3>
                    <p className="text-xs text-gray-500">Configure item pricing, kitchen prep time, and visibility</p>
                  </div>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Name</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Tandoori Roti" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price (₹)</label>
                      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="1" placeholder="0" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dietary Type</label>
                      <select value={veg ? "veg" : "non-veg"} onChange={(e) => setVeg(e.target.value === "veg")} className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none">
                        <option value="veg">🟢 Veg</option>
                        <option value="non-veg">🔴 Non-Veg</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Rich buttery bhaji with soft pavs" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cost Price (₹)</label>
                      <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g. 28" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Remarks</label>
                      <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Regular spicy, Less spicy" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Badge Label</label>
                      <input type="text" value={badgeLabel} onChange={(e) => setBadgeLabel(e.target.value)} placeholder="e.g. Best Seller" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Photo (Optional)</label>
                    <input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-[#0B0E14] border border-gray-700 text-gray-400 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#E5B35C] file:text-[#0B0E14] hover:file:bg-[#d4a24b] cursor-pointer" />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#1F2330]">
                    <button type="submit" disabled={isSaving || isUploadingImage} className="flex-1 bg-[#E5B35C] text-[#0B0E14] font-black py-3 rounded-xl text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50">
                      {isUploadingImage ? 'Uploading...' : isSaving ? 'Saving...' : 'Save & Publish Dish'}
                    </button>
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-gray-800 text-gray-400 font-bold text-sm rounded-xl hover:bg-gray-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 📦 VIEW 2: RAW STOCK / PANTRY (Inventory Pool)                 */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div>
          {/* Add Raw Item Form */}
          <form onSubmit={handleAddRawItem} className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-6 shadow-xl mb-8">
            <h3 className="text-lg font-bold text-gray-200 mb-2">Register Raw Ingredient</h3>
            <p className="text-xs text-gray-500 mb-4">Stock registered here can be linked to your dishes or counted for packaged items.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ingredient Name</label>
                <input type="text" value={rawName} onChange={(e) => setRawName(e.target.value)} required placeholder="e.g. Sandwich Bread, Dairy Milk" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Strict Base Unit</label>
                <select value={rawUnit} onChange={(e) => setRawUnit(e.target.value as any)} className="w-full bg-[#0B0E14] border border-gray-700 text-[#E5B35C] font-bold rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none">
                  <option value="pcs">pcs (buns, cans, slices)</option>
                  <option value="g">g (solids: butter, flour)</option>
                  <option value="ml">ml (liquids: milk, oil)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Initial Stock</label>
                <input type="number" value={rawStock} onChange={(e) => setRawStock(e.target.value)} required placeholder="e.g. 50" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Min. Alert Level</label>
                <input type="number" value={rawAlert} onChange={(e) => setRawAlert(e.target.value)} required placeholder="10" className="w-full bg-[#0B0E14] border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:border-[#E5B35C] focus:outline-none" />
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-[#1F2330]">
              <button type="submit" disabled={isSavingRaw} className="bg-[#E5B35C] text-black font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-[#d4a24b] transition-all disabled:opacity-50">
                {isSavingRaw ? 'Registering...' : '+ Add to Stock Pool'}
              </button>
            </div>
          </form>

          {/* Raw Stock Table */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B0E14] border-b border-[#1F2330] text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Raw Ingredient</th>
                  <th className="p-4">Base Unit</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2330]">
                {rawItems.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No raw ingredients tracked. Register bread, milk, or butter above.</td></tr>
                ) : (
                  rawItems.map((item) => {
                    const isLow = item.currentStock <= item.minAlert;
                    return (
                      <tr key={item.id} className="hover:bg-[#1a1f2b] transition-colors">
                        <td className="p-4 font-medium text-white">{item.name}</td>
                        <td className="p-4 text-xs text-gray-400 font-mono uppercase">{item.unit}</td>
                        <td className="p-4 text-sm font-bold text-white">
                          {item.currentStock} <span className="text-gray-500 text-xs font-normal">{item.unit}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            isLow ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {isLow ? 'Low Stock' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔗 MODAL: RECIPE BUILDER (Map ingredients to Dish)             */}
      {/* ============================================================== */}
      {recipeItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Recipe: {recipeItem.name}</h3>
                <p className="text-xs text-gray-500">Define raw stock consumed per single plate/order.</p>
              </div>
              <button onClick={() => setRecipeItem(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar mb-4">
              {recipeIngredients.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No ingredients linked. This dish will not decrement raw inventory.</p>
              ) : (
                recipeIngredients.map((row, idx) => {
                  const targetItem = rawItems.find(r => r.id === row.inventoryItemId);
                  return (
                    <div key={idx} className="flex gap-2 items-center bg-[#0B0E14] p-2.5 rounded-lg border border-gray-800">
                      <select 
                        value={row.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[idx].inventoryItemId = e.target.value;
                          setRecipeIngredients(updated);
                        }}
                        className="flex-1 bg-[#1A1D24] text-xs text-white p-2 rounded border border-gray-700 outline-none"
                      >
                        <option value="">Select ingredient...</option>
                        {rawItems.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
                        ))}
                      </select>

                      <input 
                        type="number" 
                        value={row.quantityUsed}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[idx].quantityUsed = Number(e.target.value);
                          setRecipeIngredients(updated);
                        }}
                        placeholder="Qty"
                        className="w-20 bg-[#1A1D24] text-xs text-white p-2 rounded border border-gray-700 outline-none"
                      />
                      <span className="text-[10px] text-[#E5B35C] font-mono w-8">{targetItem?.unit || ''}</span>

                      <button 
                        onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-400 px-2 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              onClick={() => setRecipeIngredients([...recipeIngredients, { inventoryItemId: rawItems[0]?.id || '', quantityUsed: 1 }])}
              className="text-xs text-[#E5B35C] hover:underline font-bold mb-6 block"
            >
              + Add Ingredient
            </button>

            <div className="flex gap-3">
              <button 
                onClick={handleSaveRecipe}
                disabled={isSavingRecipe}
                className="flex-1 py-2.5 bg-[#E5B35C] text-black font-bold text-xs rounded-xl hover:bg-[#d4a24b] transition-all disabled:opacity-50"
              >
                {isSavingRecipe ? 'Saving...' : 'Save Recipe'}
              </button>
              <button 
                onClick={() => setRecipeItem(null)}
                className="px-4 py-2.5 bg-gray-800 text-gray-400 text-xs rounded-xl hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL (Unchanged) --- */}
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
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Cost price (₹)</label>
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