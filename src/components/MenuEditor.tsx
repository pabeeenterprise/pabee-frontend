import { useState, useEffect, useMemo } from 'react';
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

const CATEGORIES = ['Breakfast', 'Snacks', 'Food', 'Drinks', 'Dessert'];

export default function MenuEditor({ vendorId }: { vendorId: string }) {
  const [activeTab, setActiveTab] = useState<'dishes' | 'inventory'>('dishes');

  // Dish States
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDishModal, setShowDishModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Dish Form States
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState('Food');
  const [dishPrice, setDishPrice] = useState('');
  const [dishPrep, setDishPrep] = useState('10 min');
  const [dishVeg, setDishVeg] = useState(true);
  const [dishDescription, setDishDescription] = useState('');
  const [dishCostPrice, setDishCostPrice] = useState('');
  const [dishRemarks, setDishRemarks] = useState('');
  const [dishBadgeLabel, setDishBadgeLabel] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Raw Inventory States
  const [rawItems, setRawItems] = useState<InventoryItem[]>([]);
  const [showAddRawModal, setShowAddRawModal] = useState(false);
  const [rawName, setRawName] = useState('');
  const [rawUnit, setRawUnit] = useState<'g' | 'ml' | 'pcs'>('pcs');
  const [rawStock, setRawStock] = useState('');
  const [rawAlert, setRawAlert] = useState('10');
  const [rawCost, setRawCost] = useState('');
  const [isSavingRaw, setIsSavingRaw] = useState(false);

  // Refill Modal States
  const [refillItem, setRefillItem] = useState<InventoryItem | null>(null);
  const [refillQty, setRefillQty] = useState('');
  const [refillCost, setRefillCost] = useState('');
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);

  // Recipe Builder Modal States
  const [recipeDish, setRecipeDish] = useState<MenuItem | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const { getToken } = useAuth();

  // 1. Fetch Dishes
  const fetchMenu = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Raw Inventory
  const fetchInventory = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const stockItems: InventoryItem[] = data.items || [];
        setRawItems(stockItems);

        const depleted = stockItems.filter(
          (item) => Number(item.currentStock) <= Number(item.minAlert)
        );
        if (depleted.length > 0) {
          toast.error(
            `⚠️ Low Stock: ${depleted.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')}`,
            { id: 'inventory-alert', duration: 7000 }
          );
        }
      }
    } catch {
      toast.error('Failed to load inventory');
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    fetchMenu();
    fetchInventory();

    const interval = setInterval(() => {
      fetchInventory();
    }, 15000);

    return () => clearInterval(interval);
  }, [vendorId]);

  // Open Add Dish Form
  const openAddDish = () => {
    setEditingItem(null);
    setDishName('');
    setDishCategory('Food');
    setDishPrice('');
    setDishPrep('10 min');
    setDishVeg(true);
    setDishDescription('');
    setDishCostPrice('');
    setDishRemarks('');
    setDishBadgeLabel('');
    setImageFile(null);
    setShowMoreOptions(false);
    setShowDishModal(true);
  };

  // Open Edit Dish Form
  const openEditDish = (item: MenuItem) => {
    setEditingItem(item);
    setDishName(item.name);
    setDishCategory(item.category || 'Food');
    setDishPrice(item.price.toString());
    setDishPrep(item.prep || '10 min');
    setDishVeg(item.veg);
    setDishDescription(item.description || '');
    setDishCostPrice(item.costPrice ? item.costPrice.toString() : '');
    setDishRemarks(item.remarks || '');
    setDishBadgeLabel(item.badgeLabel || '');
    setImageFile(null);
    setShowMoreOptions(Boolean(item.costPrice || item.remarks || item.badgeLabel));
    setShowDishModal(true);
  };

  // Dynamically extract and title-case unique categories to prevent duplicate headers
  const dynamicCategories = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((it) => {
      const raw = it.category?.trim();
      const normalized = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : 'Food';
      unique.add(normalized);
    });
    return Array.from(unique);
  }, [items]);

// Ensure the modal offers default categories plus any existing custom ones (like "Non-veg")
const modalCategories = useMemo(() => {
  const set = new Set([...CATEGORIES, ...dynamicCategories]);
  if (dishCategory && dishCategory.trim()) {
    set.add(dishCategory.trim());
  }
  return Array.from(set);
}, [dynamicCategories, dishCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      e.target.value = '';
      return;
    }
    setImageFile(file);
  };

  // Save Dish (Create or Update)
  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim() || !dishPrice) {
      toast.error('Add a name and price');
      return;
    }

    setIsSaving(true);
    let finalImageUrl = editingItem ? editingItem.imageUrl : null;

    try {
      if (imageFile) {
        setIsUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${vendorId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('menu-items')
          .upload(fileName, imageFile);

        if (uploadError) throw new Error('Failed to upload image');
        const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
        setIsUploadingImage(false);
      }

      const token = await getToken();
      const payload = {
        name: dishName.trim(),
        category: dishCategory,
        price: Number(dishPrice),
        prep: dishPrep,
        veg: dishVeg,
        available: editingItem ? editingItem.available : true,
        imageUrl: finalImageUrl,
        description: dishDescription.trim() || null,
        costPrice: dishCostPrice ? Number(dishCostPrice) : null,
        remarks: dishRemarks.trim() || null,
        badgeLabel: dishBadgeLabel.trim() || null,
      };

      const url = editingItem
        ? `${API_URL}/api/vendors/${vendorId}/menu/${editingItem.id}`
        : `${API_URL}/api/vendors/${vendorId}/menu`;

      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Database sync failed');

      toast.success(editingItem ? 'Dish updated!' : 'New dish added!');
      setShowDishModal(false);
      fetchMenu();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving dish';
      toast.error(msg);
      setIsUploadingImage(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Instant Availability Toggle Switch
  const toggleAvailable = async (item: MenuItem) => {
    try {
      const token = await getToken();
      const updatedStatus = !item.available;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: updatedStatus } : i))
      );

      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ available: updatedStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(updatedStatus ? `${item.name} is In Stock` : `${item.name} marked Sold Out`);
    } catch {
      toast.error('Failed to change stock status');
      fetchMenu();
    }
  };

  // Delete Dish
  const handleDeleteDish = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Dish deleted');
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setShowDishModal(false);
      }
    } catch {
      toast.error('Failed to delete dish');
    }
  };

  // Add Raw Ingredient
  const handleAddRawItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawName.trim()) return toast.error('Enter an ingredient name');
    setIsSavingRaw(true);

    try {
      const token = await getToken();
      const stockQty = Number(rawStock) || 0;
      const totalCostPaid = Number(rawCost) || 0;
      const costPerUnit = stockQty > 0 ? totalCostPaid / stockQty : 0;

      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: rawName.trim(),
          unit: rawUnit,
          currentStock: stockQty,
          minAlert: Number(rawAlert) || 0,
          costPerUnit,
          totalPurchaseCost: totalCostPaid,
        }),
      });

      if (res.ok) {
        toast.success('Ingredient added to pantry');
        setRawName('');
        setRawStock('');
        setRawCost('');
        setShowAddRawModal(false);
        fetchInventory();
      } else {
        toast.error('Failed to add ingredient');
      }
    } catch {
      toast.error('Network error adding stock');
    } finally {
      setIsSavingRaw(false);
    }
  };

  // Refill Submit
  const handleRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillItem || !refillQty) return;
    setIsSubmittingRefill(true);

    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/vendors/${vendorId}/inventory/${refillItem.id}/restock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantityToAdd: Number(refillQty),
            totalPurchaseCost: Number(refillCost) || 0,
          }),
        }
      );

      if (res.ok) {
        toast.success(`Refilled ${refillItem.name}! Added to P&L.`);
        setRefillItem(null);
        setRefillQty('');
        setRefillCost('');
        fetchInventory();
        fetchMenu();
      } else {
        toast.error('Refill failed');
      }
    } catch {
      toast.error('Network error refilling stock');
    } finally {
      setIsSubmittingRefill(false);
    }
  };

  // Open Recipe Modal
  const openRecipeModal = async (dish: MenuItem) => {
    setRecipeDish(dish);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${dish.id}/recipe`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecipeIngredients(
          data.recipe?.map((r: { inventoryItemId: string; quantityUsed: number }) => ({
            inventoryItemId: r.inventoryItemId,
            quantityUsed: r.quantityUsed,
          })) || []
        );
      }
    } catch {
      setRecipeIngredients([]);
    }
  };

  // Save Recipe
  const handleSaveRecipe = async () => {
    if (!recipeDish) return;
    setIsSavingRecipe(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/menu/${recipeDish.id}/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ingredients: recipeIngredients }),
      });

      if (res.ok) {
        toast.success('Recipe linked to pantry stock!');
        setRecipeDish(null);
      } else {
        toast.error('Failed to link recipe');
      }
    } catch {
      toast.error('Network error saving recipe');
    } finally {
      setIsSavingRecipe(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Loading menu configuration…
      </div>
    );
  }

  const hasLowStock = rawItems.some((i) => Number(i.currentStock) <= Number(i.minAlert));

  return (
    <div className="max-w-4xl mx-auto text-[#F5F0E8] font-sans pb-28 md:pb-12">
      
      {/* 1. Prototype Top Pill Segment (`.seg`) */}
      <div className="flex justify-between items-center flex-wrap gap-3 pb-3 border-b border-[#3A352E]">
        <div className="inline-flex border border-[#3A352E] rounded-full overflow-hidden bg-[#1C1A18] p-0.5">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`min-h-[40px] px-5 rounded-full text-sm font-semibold transition-colors ${
              activeTab === 'dishes'
                ? 'bg-[#F5F0E8] text-[#121110]'
                : 'text-[#9A9184] hover:text-[#F5F0E8]'
            }`}
          >
            Dishes ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`min-h-[40px] px-5 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'inventory'
                ? 'bg-[#F5F0E8] text-[#121110]'
                : 'text-[#9A9184] hover:text-[#F5F0E8]'
            }`}
          >
            <span>Pantry Stock ({rawItems.length})</span>
            {hasLowStock && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Action Button */}
        {activeTab === 'dishes' ? (
          <button
            onClick={openAddDish}
            className="min-h-[44px] px-5 rounded-full bg-[#F5F0E8] text-[#121110] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            + Add a dish
          </button>
        ) : (
          <button
            onClick={() => setShowAddRawModal(true)}
            className="min-h-[44px] px-5 rounded-full bg-[#F5F0E8] text-[#121110] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            + Add raw item
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DISHES (Prototype .mrow List)                           */}
      {/* ============================================================== */}
      {activeTab === 'dishes' && (
        <div className="mt-4">
          {items.length === 0 ? (
            <div className="p-12 text-center text-[#9A9184] text-sm">
              No dishes on the menu yet. Tap &quot;+ Add a dish&quot; to begin.
            </div>
          ) : (
            dynamicCategories.map((cat) => {
              const categoryItems = items.filter(
                (it) => (it.category?.trim() || 'Food').toLowerCase() === cat.toLowerCase()
              );
              if (categoryItems.length === 0) return null;

              return (
                <div key={cat} className="mb-6">
                  {/* Category Header */}
                  <div className="text-xs font-bold uppercase tracking-wider text-[#9A9184] px-4 py-2 bg-[#1C1A18] border-y border-[#3A352E]">
                    {cat} · {categoryItems.length}
                  </div>

                  {/* Dish Rows */}
                  <div className="divide-y divide-[#3A352E]">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[16px_1fr_auto] gap-3 items-center min-h-[64px] px-4 py-2 hover:bg-[#1C1A18]/50 transition-colors"
                      >
                        {/* Veg / Non-Veg Mark */}
                        <span
                          role="img"
                          aria-label={item.veg ? 'Veg' : 'Non-veg'}
                          className={`w-4 h-4 border-[1.5px] rounded-[2px] inline-grid place-items-center shrink-0 ${
                            item.veg ? 'border-[#34B866]' : 'border-[#C77A45]'
                          }`}
                        >
                          <span
                            className={
                              item.veg
                                ? 'w-[7px] h-[7px] rounded-full bg-[#34B866]'
                                : 'w-[8px] h-[7px] bg-[#C77A45] [clip-path:polygon(50%_0,100%_100%,0_100%)]'
                            }
                          />
                        </span>

                        {/* Dish Details */}
                        <button
                          onClick={() => openEditDish(item)}
                          className="block w-full text-left min-h-[52px] py-1 truncate"
                        >
                          <b className="block font-semibold text-base leading-snug text-white truncate">
                            {item.name}
                            {item.badgeLabel && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                                {item.badgeLabel}
                              </span>
                            )}
                          </b>
                          <span
                            className={`text-sm tabular-nums ${
                              item.available ? 'text-[#C7BFB2]' : 'text-[#9A9184] font-semibold'
                            }`}
                          >
                            ₹{item.price} · {item.prep}
                            {!item.available && ' · Sold out today'}
                          </span>
                        </button>

                        {/* Actions: Recipe + Toggle Switch */}
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => openRecipeModal(item)}
                            className="min-h-[36px] px-3 rounded-full border border-[#3A352E] bg-[#1C1A18] text-xs font-semibold text-[#C7BFB2] hover:text-white transition-colors"
                          >
                            🔗 Recipe
                          </button>

                          <button
                            onClick={() => toggleAvailable(item)}
                            aria-pressed={item.available}
                            aria-label={`Toggle availability for ${item.name}`}
                            className="flex items-center min-h-[56px]"
                          >
                            <span
                              className={`w-11 h-6 rounded-full relative transition-colors ${
                                item.available ? 'bg-[#34B866]' : 'bg-[#3A352E]'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                  item.available ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PANTRY STOCK (Prototype `.ing` Rows & Low Alerts)       */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="mt-4">
          {rawItems.length === 0 ? (
            <div className="p-12 text-center text-[#9A9184] text-sm">
              No raw ingredients tracked. Tap &quot;+ Add raw item&quot; to register milk, bread, or tea.
            </div>
          ) : (
            <div className="divide-y divide-[#3A352E] border-t border-[#3A352E]">
              {rawItems.map((item) => {
                const isLow = Number(item.currentStock) <= Number(item.minAlert);

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-3 items-center min-h-[72px] px-4 py-2.5 hover:bg-[#1C1A18]/50 transition-colors"
                  >
                    <div>
                      <b className="text-base font-semibold text-white">{item.name}</b>
                      <span className="text-xs text-[#9A9184] block mt-0.5">
                        ₹{item.costPerUnit ? item.costPerUnit.toFixed(2) : '0.00'}/{item.unit} · Alert at {item.minAlert} {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div
                          className={`text-2xl font-bold tabular-nums ${
                            isLow ? 'text-amber-400' : 'text-white'
                          }`}
                        >
                          {item.currentStock}{' '}
                          <span className="text-xs text-[#9A9184] font-normal">{item.unit}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isLow ? 'bg-amber-500/20 text-amber-300' : 'bg-[#15291B] text-[#5CC97B]'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setRefillItem(item);
                          setRefillQty('');
                          setRefillCost('');
                        }}
                        className="min-h-[36px] px-3.5 rounded-full bg-[#E5B35C] text-[#1A1206] font-semibold text-xs active:scale-95 transition-transform"
                      >
                        + Refill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌟 PROTOTYPE BOTTOM SHEET: ADD / EDIT DISH (`.sheet`)          */}
      {/* ============================================================== */}
      {showDishModal && (
        <div
          onClick={() => setShowDishModal(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl max-h-[88vh] overflow-y-auto no-scrollbar space-y-4"
          >
            <div className="w-9 h-1 rounded-full bg-[#3A352E] mx-auto sm:hidden" />

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit dish' : 'New dish'}
              </h3>
              <button
                type="button"
                onClick={() => setShowDishModal(false)}
                className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-4">
              {/* Dish Name */}
              <div>
                <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Dish name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vada Pav"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                />
              </div>

              {/* Price & Prep */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="25"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                    Prep time
                  </label>
                  <input
                    type="text"
                    placeholder="5 min"
                    value={dishPrep}
                    onChange={(e) => setDishPrep(e.target.value)}
                    className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                  />
                </div>
              </div>

              {/* Dietary Picker (`.vegpick`) */}
              <div>
                <span className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Dietary type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDishVeg(true)}
                    className={`min-h-[52px] rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                      dishVeg
                        ? 'border-2 border-[#F5F0E8] bg-[#26231F] text-white'
                        : 'border-[#3A352E] bg-[#1C1A18] text-[#9A9184]'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 border border-[#34B866] rounded-[2px] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34B866]" />
                    </span>
                    <span>Veg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDishVeg(false)}
                    className={`min-h-[52px] rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                      !dishVeg
                        ? 'border-2 border-[#F5F0E8] bg-[#26231F] text-white'
                        : 'border-[#3A352E] bg-[#1C1A18] text-[#9A9184]'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 border border-[#C77A45] rounded-[2px] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-[#C77A45] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
                    </span>
                    <span>Non-veg</span>
                  </button>
                </div>
              </div>

              {/* Category Chips */}
              <div>
                <span className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">Category</span>
                <div className="flex gap-2 flex-wrap">
                  {modalCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDishCategory(cat)}
                      className={`min-h-[40px] px-4 rounded-full border text-sm font-semibold transition-colors ${
                        dishCategory.toLowerCase() === cat.toLowerCase()
                          ? 'bg-[#F5F0E8] text-[#121110] border-[#F5F0E8]'
                          : 'bg-[#26231F] text-[#C7BFB2] border-[#3A352E]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Spicy potato vada with dry garlic chutney"
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-sm text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Dish photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full bg-[#26231F] border border-[#3A352E] text-xs text-[#9A9184] rounded-lg p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#E5B35C] file:text-[#1A1206] cursor-pointer"
                />
              </div>

              {/* Expandable Options Toggle */}
              {!showMoreOptions ? (
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(true)}
                  className="text-xs font-semibold text-[#E5B35C] hover:underline block pt-1"
                >
                  More options (cost price, badge label) ▾
                </button>
              ) : (
                <div className="space-y-3 pt-2 border-t border-[#3A352E]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#C7BFB2] mb-1">
                        Cost to make (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 12"
                        value={dishCostPrice}
                        onChange={(e) => setDishCostPrice(e.target.value)}
                        className="w-full h-11 rounded-lg border border-[#3A352E] bg-[#26231F] px-3 text-sm text-white outline-none focus:border-[#E5B35C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C7BFB2] mb-1">
                        Badge label
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bestseller"
                        value={dishBadgeLabel}
                        onChange={(e) => setDishBadgeLabel(e.target.value)}
                        className="w-full h-11 rounded-lg border border-[#3A352E] bg-[#26231F] px-3 text-sm text-white outline-none focus:border-[#E5B35C]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-[#3A352E] flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage}
                  className="flex-1 h-[52px] rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-[17px] active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {isUploadingImage
                    ? 'Uploading image…'
                    : isSaving
                    ? 'Saving…'
                    : editingItem
                    ? 'Save changes'
                    : 'Add dish'}
                </button>

                {editingItem && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDish(editingItem.id)}
                    className="px-4 h-[52px] rounded-xl border border-red-500/40 text-red-400 font-semibold text-sm hover:bg-red-950/20 active:scale-95 transition-all"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌟 PROTOTYPE BOTTOM SHEET: ADD RAW INGREDIENT                  */}
      {/* ============================================================== */}
      {showAddRawModal && (
        <div
          onClick={() => setShowAddRawModal(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar space-y-4"
          >
            <div className="w-9 h-1 rounded-full bg-[#3A352E] mx-auto sm:hidden" />

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Add raw item</h3>
              <button
                type="button"
                onClick={() => setShowAddRawModal(false)}
                className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRawItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Ingredient name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Milk, Sandwich Pav, Potatoes"
                  value={rawName}
                  onChange={(e) => setRawName(e.target.value)}
                  className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                    Base unit
                  </label>
                  <select
                    value={rawUnit}
                    onChange={(e) => setRawUnit(e.target.value as 'g' | 'ml' | 'pcs')}
                    className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3 text-sm text-[#E5B35C] font-semibold outline-none focus:border-[#E5B35C]"
                  >
                    <option value="pcs">pcs (buns, eggs, slices)</option>
                    <option value="ml">ml (milk, oil, syrups)</option>
                    <option value="g">g (potatoes, butter, flour)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                    Initial stock ({rawUnit})
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={rawStock}
                    onChange={(e) => setRawStock(e.target.value)}
                    className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                    Total paid (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 250"
                    value={rawCost}
                    onChange={(e) => setRawCost(e.target.value)}
                    className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                    Min alert level ({rawUnit})
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={rawAlert}
                    onChange={(e) => setRawAlert(e.target.value)}
                    className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingRaw}
                className="w-full h-[52px] rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-[17px] active:scale-[0.98] transition-transform disabled:opacity-50 mt-2"
              >
                {isSavingRaw ? 'Saving…' : 'Register ingredient'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌟 PROTOTYPE BOTTOM SHEET: REFILL INVENTORY                    */}
      {/* ============================================================== */}
      {refillItem && (
        <div
          onClick={() => setRefillItem(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl space-y-4"
          >
            <div className="w-9 h-1 rounded-full bg-[#3A352E] mx-auto sm:hidden" />

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Refill: {refillItem.name}</h3>
              <button
                type="button"
                onClick={() => setRefillItem(null)}
                className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRefillSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Quantity to add ({refillItem.unit}) *
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  min="1"
                  placeholder={`e.g. 500 ${refillItem.unit}`}
                  value={refillQty}
                  onChange={(e) => setRefillQty(e.target.value)}
                  className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-lg font-bold text-white outline-none focus:border-[#E5B35C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C7BFB2] mb-1.5">
                  Total purchase cost (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 140 (deducts from today's profit)"
                  value={refillCost}
                  onChange={(e) => setRefillCost(e.target.value)}
                  className="w-full h-12 rounded-lg border border-[#3A352E] bg-[#26231F] px-3.5 text-base text-white outline-none focus:border-[#E5B35C]"
                />
                <span className="text-[11px] text-[#9A9184] mt-1 block">
                  Automatically logs to your Daily P&amp;L Ledger.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingRefill}
                className="w-full h-[52px] rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-[17px] active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isSubmittingRefill ? 'Updating stock…' : 'Confirm refill'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌟 PROTOTYPE BOTTOM SHEET: RECIPE BUILDER                     */}
      {/* ============================================================== */}
      {recipeDish && (
        <div
          onClick={() => setRecipeDish(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar space-y-4"
          >
            <div className="w-9 h-1 rounded-full bg-[#3A352E] mx-auto sm:hidden" />

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-white">Recipe: {recipeDish.name}</h3>
                <p className="text-xs text-[#9A9184] mt-0.5">
                  Pantry stock consumed per single plate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecipeDish(null)}
                className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar pr-1">
              {recipeIngredients.length === 0 ? (
                <p className="text-xs text-[#9A9184] text-center py-4">
                  No ingredients linked yet. This dish won&apos;t decrement pantry stock.
                </p>
              ) : (
                recipeIngredients.map((row, idx) => {
                  const targetItem = rawItems.find((r) => r.id === row.inventoryItemId);

                  return (
                    <div
                      key={idx}
                      className="flex gap-2 items-center bg-[#26231F] p-2 rounded-xl border border-[#3A352E]"
                    >
                      <select
                        value={row.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[idx].inventoryItemId = e.target.value;
                          setRecipeIngredients(updated);
                        }}
                        className="flex-1 bg-[#1C1A18] text-xs text-white p-2.5 rounded-lg border border-[#3A352E] outline-none"
                      >
                        <option value="">Select ingredient…</option>
                        {rawItems.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={row.quantityUsed}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[idx].quantityUsed = Number(e.target.value);
                          setRecipeIngredients(updated);
                        }}
                        placeholder="Qty"
                        className="w-20 bg-[#1C1A18] text-xs text-white p-2.5 rounded-lg border border-[#3A352E] outline-none text-center font-bold"
                      />

                      <span className="text-xs text-[#E5B35C] font-mono w-8 shrink-0 text-center">
                        {targetItem?.unit || ''}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx))
                        }
                        className="text-red-400 hover:text-red-300 px-2 font-bold text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setRecipeIngredients([
                  ...recipeIngredients,
                  { inventoryItemId: rawItems[0]?.id || '', quantityUsed: 1 },
                ])
              }
              className="text-xs text-[#E5B35C] hover:underline font-semibold block"
            >
              + Add ingredient
            </button>

            <button
              type="button"
              onClick={handleSaveRecipe}
              disabled={isSavingRecipe}
              className="w-full h-[52px] rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-[17px] active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {isSavingRecipe ? 'Saving recipe…' : 'Save recipe'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}