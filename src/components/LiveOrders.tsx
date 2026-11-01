import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id?: string;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  createdAt: string;
  paymentMode: string;
  kitchenStatus: string;
  total: number;
  token: number;
  tableId?: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  veg?: boolean;
}

interface LiveOrdersProps {
  vendorId: string;
  mode?: 'queue' | 'pos';
  soundEnabled?: boolean;
}

export default function LiveOrders({ vendorId, mode = 'queue', soundEnabled = true }: LiveOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Queue View State
  const [queueTab, setQueueTab] = useState<'active' | 'history'>('active');

  // POS State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [posCart, setPosCart] = useState<OrderItem[]>([]);
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isParcel, setIsParcel] = useState(false);
  const [cashGiven, setCashGiven] = useState<number | null>(null);
  const [activePromo, setActivePromo] = useState<any | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  // 🔔 Audio Alarm Trigger for Incoming Orders
  const prevOrderCountRef = useRef<number>(0);

  const playRing = () => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('/bell.wav');
      audio.play().catch((e) => console.warn('Audio autoplay blocked', e));
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (err) {
      console.error('Audio ring error', err);
    }
  };

  const fetchData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [liveRes, histRes] = await Promise.all([
        fetch(`${API_URL}/api/vendors/${vendorId}/kitchen-queue`, { headers }),
        fetch(`${API_URL}/api/vendors/${vendorId}/sales`, { headers }),
      ]);

      if (liveRes.ok) {
        const liveData = await liveRes.json();
        const incomingOrders: Order[] = liveData.orders || [];

        // Ring audio if new pending order arrived
        if (
          prevOrderCountRef.current > 0 &&
          incomingOrders.length > prevOrderCountRef.current
        ) {
          playRing();
        }
        prevOrderCountRef.current = incomingOrders.length;
        setOrders(incomingOrders);
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        setHistoryOrders(histData.orders || []);
      }

      // Fetch Menu & Promos for POS on initial load
      if (menuItems.length === 0) {
        const [menuRes, promoRes] = await Promise.all([
          fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, { headers }),
          fetch(`${API_URL}/api/vendors/${vendorId}/promos?activeOnly=true`, { headers }),
        ]);

        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenuItems(menuData.items || []);
        }

        if (promoRes.ok) {
          const promoData = await promoRes.json();
          const valid = promoData.promos?.find((p: any) => {
            if (!p.isActive) return false;
            if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false;
            return true;
          });
          setActivePromo(valid || null);
        }
      }
    } catch (err) {
      console.error('Data sync failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [vendorId]);

  // 🧮 1. "To Make Now" Kitchen Aggregation Strip
  const toMakeAggregation = useMemo(() => {
    const active = orders.filter(
      (o) => o.kitchenStatus === 'pending' || o.kitchenStatus === 'preparing'
    );
    const counts: Record<string, number> = {};
    active.forEach((order) => {
      order.items?.forEach((item) => {
        counts[item.name] = (counts[item.name] || 0) + item.qty;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  // ⏱️ 2. Age & Urgency Calculation
  const getAge = (createdAt: string) => {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    return elapsedMinutes;
  };

  // ⚡ POS Calculations
  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map((m) => m.category).filter(Boolean))];
    return ['All', ...cats];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        return item.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchTerm]);

  const addToPos = (item: MenuItem) => {
    setPosCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { name: item.name, qty: 1, price: item.price }];
    });
  };

  const updatePosQty = (name: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((i) => (i.name === name ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const rawTotal = posCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const packingFee = isParcel ? 10 : 0;
  let discountAmount = 0;
  if (applyDiscount && activePromo && rawTotal >= activePromo.minOrderValue) {
    discountAmount =
      activePromo.type === 'FLAT' ? activePromo.value : (rawTotal * activePromo.value) / 100;
  }
  const posFinalTotal = Math.max(0, rawTotal - discountAmount + packingFee);

  const clearPos = () => {
    setPosCart([]);
    setCustomerIdentifier('');
    setCustomerPhone('');
    setIsParcel(false);
    setCashGiven(null);
    setApplyDiscount(false);
  };

  // Order Submission for Walk-Up Counter
  const submitPosOrder = async (paymentMode: 'CASH' | 'UPI') => {
    if (posCart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId,
          tableId: isParcel ? 'Parcel' : 'Counter',
          customerName: customerIdentifier.trim() || 'Counter Walk-up',
          customerPhone: customerPhone.trim().length === 10 ? customerPhone.trim() : '0000000000',
          paymentMode,
          total: posFinalTotal,
          items: posCart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create counter order');
        setIsSubmitting(false);
        return;
      }

      toast.success(`Token #${data.tokenNumber} Created!`);
      clearPos();
      fetchData();
    } catch {
      toast.error('Network error creating counter order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kitchen Lifecycle Status Updates
  const updateStatus = async (orderId: string, status: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders/${orderId}/kitchen-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        if (status === 'preparing') toast.success('Cooking started 🔥');
        else if (status === 'completed') toast.success('Order marked ready ✅');
        else if (status === 'cancelled') toast.error('Order cancelled');
        fetchData();
      }
    } catch {
      toast.error('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Loading kitchen terminal…
      </div>
    );
  }

  // ==========================================
  // MODE 1: LIVE ORDERS QUEUE (KDS)
  // ==========================================
  if (mode === 'queue') {
    return (
      <div className="flex flex-col h-full bg-[#121110] text-[#F5F0E8] overflow-hidden">
        
        {/* Prototype Aggregate "To Make Now" Strip */}
        <div className="bg-[#1C1A18] border-b border-[#3A352E] px-4 py-2.5 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9A9184] shrink-0">
            To make now
          </span>
          {toMakeAggregation.length === 0 ? (
            <span className="text-xs text-[#5C554B]">All caught up</span>
          ) : (
            toMakeAggregation.map(([dishName, totalQty]) => (
              <span
                key={dishName}
                className="shrink-0 px-2.5 py-1 rounded-md bg-[#26231F] border border-[#3A352E] text-xs font-semibold flex items-center gap-1.5"
              >
                <b className="text-[#E5B35C] font-extrabold text-sm">{totalQty}×</b>
                <span>{dishName}</span>
              </span>
            ))
          )}
        </div>

        {/* View Segment Tabs */}
        <div className="flex gap-2 px-4 py-2 border-b border-[#3A352E] bg-[#121110] shrink-0">
          <button
            onClick={() => setQueueTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              queueTab === 'active'
                ? 'bg-[#E5B35C] text-[#1A1206]'
                : 'bg-[#1C1A18] text-[#9A9184] hover:text-[#F5F0E8]'
            }`}
          >
            Active Orders ({orders.length})
          </button>
          <button
            onClick={() => setQueueTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              queueTab === 'history'
                ? 'bg-[#E5B35C] text-[#1A1206]'
                : 'bg-[#1C1A18] text-[#9A9184] hover:text-[#F5F0E8]'
            }`}
          >
            Completed History ({historyOrders.length})
          </button>
        </div>

        {/* Orders Card Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {queueTab === 'active' ? (
            orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#9A9184]">
                <span className="text-4xl mb-2">🍽️</span>
                <p className="font-semibold text-base">All orders completed</p>
                <p className="text-xs text-[#5C554B]">Incoming orders will ring automatically</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {orders.map((order) => {
                  const ageMins = getAge(order.createdAt);
                  const isLate = ageMins >= 10;
                  const isSoon = ageMins >= 5 && ageMins < 10;

                  return (
                    <article
                      key={order.id}
                      className={`rounded-xl border p-3 flex flex-col justify-between shadow-sm relative overflow-hidden transition-colors ${
                        isLate
                          ? 'bg-[#33171A] border-red-500/40'
                          : isSoon
                          ? 'bg-[#2E2410] border-amber-500/40'
                          : 'bg-[#1C1A18] border-[#3A352E]'
                      }`}
                    >
                      {/* Urgency Color Accent Strip */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isLate ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-transparent'
                        }`}
                      />

                      <div className="pl-1">
                        {/* Ticket Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#3A352E]/60">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-[#E5B35C] tabular-nums">
                              #{order.token}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#26231F] text-[#C7BFB2]">
                              {order.tableId || 'Counter'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                isLate ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-[#9A9184]'
                              }`}
                            >
                              {ageMins === 0 ? 'Just now' : `${ageMins}m ago`}
                            </span>
                            <div className="text-[11px] font-semibold text-[#5CC97B]">
                              ₹{order.total} · {order.paymentMode}
                            </div>
                          </div>
                        </div>

                        {/* Customer & Cook Note */}
                        <div className="py-1.5 text-xs text-[#C7BFB2] font-semibold truncate">
                          {order.customerName}
                        </div>

                        {/* Order Items List */}
                        <div className="space-y-1 my-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                              <span className="font-semibold text-white">
                                <b className="text-[#E5B35C] mr-1.5">{item.qty}×</b>
                                {item.name}
                              </span>
                              <span className="text-xs text-[#9A9184] tabular-nums">
                                ₹{item.price * item.qty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 1-Tap Lifecycle Progression Buttons */}
                      <div className="pt-2.5 border-t border-[#3A352E]/60 flex gap-2">
                        {order.kitchenStatus === 'pending' && (
                          <button
                            onClick={() => updateStatus(order.id, 'preparing')}
                            className="w-full h-10 rounded-lg bg-[#E5B35C] text-[#1A1206] font-bold text-xs active:scale-[0.98] transition-transform"
                          >
                            Start Cooking 🔥
                          </button>
                        )}

                        {order.kitchenStatus === 'preparing' && (
                          <>
                            <button
                              onClick={() => updateStatus(order.id, 'cancelled')}
                              className="w-1/3 h-10 rounded-lg bg-red-900/30 text-red-400 border border-red-500/30 font-bold text-xs hover:bg-red-900/50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => updateStatus(order.id, 'completed')}
                              className="w-2/3 h-10 rounded-lg bg-[#5CC97B] text-[#15291B] font-extrabold text-xs active:scale-[0.98] transition-transform"
                            >
                              Mark Ready ✅
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            /* History Sub-View */
            <div className="space-y-2 max-w-4xl mx-auto">
              {historyOrders.length === 0 ? (
                <div className="p-8 text-center text-[#9A9184] text-sm">No completed orders yet today.</div>
              ) : (
                historyOrders.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3 rounded-xl bg-[#1C1A18] border border-[#3A352E] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#E5B35C]">#{hist.token}</span>
                        <span className="text-sm font-semibold">{hist.customerName}</span>
                        <span className="text-xs text-[#9A9184]">({hist.tableId || 'Counter'})</span>
                      </div>
                      <div className="text-xs text-[#9A9184] mt-0.5">
                        {hist.items?.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-[#5CC97B]">₹{hist.total}</div>
                      <div className="text-[10px] text-[#9A9184]">{hist.paymentMode}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 2: RAPID COUNTER TOUCH POS
  // ==========================================
  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#121110] text-[#F5F0E8] overflow-hidden">
      
      {/* LEFT: Menu Selection Pad */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#3A352E]">
        
        {/* Search & Category Header */}
        <div className="space-y-2.5 pb-3 shrink-0">
          <input
            type="search"
            placeholder="Type 2 letters (e.g. 'Va' for Vada Pav)…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 rounded-xl bg-[#1C1A18] border border-[#3A352E] px-3.5 text-sm text-[#F5F0E8] outline-none focus:border-[#E5B35C]"
          />

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#E5B35C] text-[#1A1206]'
                    : 'bg-[#1C1A18] border border-[#3A352E] text-[#C7BFB2]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Tap Item Tile Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pr-1">
          {filteredMenuItems.map((item) => {
            const inCartItem = posCart.find((c) => c.name === item.name);
            const qty = inCartItem?.qty || 0;

            return (
              <button
                key={item.id}
                onClick={() => addToPos(item)}
                className="h-24 p-2.5 rounded-xl bg-[#1C1A18] border border-[#3A352E] flex flex-col justify-between text-left hover:border-[#E5B35C] active:scale-[0.98] transition-transform relative overflow-hidden"
              >
                <div className="text-xs font-bold leading-tight line-clamp-2">{item.name}</div>
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm font-extrabold text-[#E5B35C] tabular-nums">
                    ₹{item.price}
                  </span>
                  {qty > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#E5B35C] text-[#1A1206] font-black text-xs grid place-items-center">
                      {qty}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Active Bill & Checkout Register */}
      <div className="w-full lg:w-96 bg-[#1C1A18] p-4 flex flex-col justify-between shrink-0 h-auto lg:h-full overflow-y-auto border-t lg:border-t-0 border-[#3A352E]">
        <div>
          <div className="flex justify-between items-center pb-2.5 border-b border-[#3A352E]">
            <h2 className="font-bold text-base">Counter Bill</h2>
            {posCart.length > 0 && (
              <button onClick={clearPos} className="text-xs text-red-400 underline">
                Clear All
              </button>
            )}
          </div>

          {/* Customer Identifier & Phone */}
          <div className="grid grid-cols-2 gap-2 my-2.5">
            <input
              type="text"
              placeholder="Identifier (e.g. Red Shirt)"
              value={customerIdentifier}
              onChange={(e) => setCustomerIdentifier(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-[#26231F] border border-[#3A352E] text-xs outline-none focus:border-[#E5B35C]"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              className="h-9 px-2.5 rounded-lg bg-[#26231F] border border-[#3A352E] text-xs outline-none focus:border-[#E5B35C]"
            />
          </div>

          {/* Parcel Toggle */}
          <button
            type="button"
            onClick={() => setIsParcel(!isParcel)}
            className="flex items-center gap-2 mb-3 text-xs font-semibold text-[#C7BFB2]"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                isParcel ? 'bg-[#E5B35C] text-[#1A1206] border-[#E5B35C]' : 'border-[#7A7266]'
              }`}
            >
              {isParcel ? '✓' : ''}
            </span>
            <span>📦 Parcel (+₹10 packing)</span>
          </button>

          {/* Cart Item Lines */}
          <div className="space-y-2 max-h-48 lg:max-h-64 overflow-y-auto pr-1 divide-y divide-[#3A352E]/40">
            {posCart.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A7266]">Tap dishes to add to bill</div>
            ) : (
              posCart.map((item) => (
                <div key={item.name} className="pt-2 flex justify-between items-center text-xs">
                  <div className="truncate pr-2">
                    <span className="font-semibold block truncate">{item.name}</span>
                    <span className="text-[#9A9184]">₹{item.price} each</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-[#3A352E] rounded-md overflow-hidden">
                      <button
                        onClick={() => updatePosQty(item.name, -1)}
                        className="w-6 h-6 bg-[#26231F] text-sm font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="px-2 text-xs font-bold text-[#E5B35C]">{item.qty}</span>
                      <button
                        onClick={() => updatePosQty(item.name, 1)}
                        className="w-6 h-6 bg-[#26231F] text-sm font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold tabular-nums w-12 text-right">
                      ₹{item.price * item.qty}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Register Summary & Cash Calculator */}
        <div className="pt-3 border-t border-[#3A352E] space-y-2.5 mt-2">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total to Collect</span>
            <span className="text-xl text-[#E5B35C] tabular-nums">₹{posFinalTotal}</span>
          </div>

          {/* Quick Cash Denomination Calculator */}
          {posCart.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-[#9A9184] font-bold uppercase">Customer Gave:</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[posFinalTotal, 50, 100, 200, 500].map((amt) => {
                  if (amt < posFinalTotal && amt !== posFinalTotal) return null;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashGiven(amt)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        cashGiven === amt
                          ? 'border-[#E5B35C] bg-[#E5B35C]/20 text-[#E5B35C]'
                          : 'border-[#3A352E] bg-[#26231F] text-[#C7BFB2]'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  );
                })}
              </div>

              {cashGiven !== null && cashGiven >= posFinalTotal && (
                <div className="p-2 rounded-lg bg-[#2E2410] border border-amber-500/30 text-amber-300 text-xs font-bold flex justify-between items-center">
                  <span>Return Change:</span>
                  <span className="text-base tabular-nums">₹{cashGiven - posFinalTotal}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Execution */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={isSubmitting || posCart.length === 0}
              onClick={() => submitPosOrder('CASH')}
              className="h-12 rounded-xl bg-[#26231F] border border-[#3A352E] font-bold text-xs hover:border-[#E5B35C] active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              💵 Collect Cash
            </button>

            <button
              disabled={isSubmitting || posCart.length === 0}
              onClick={() => submitPosOrder('UPI')}
              className="h-12 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-xs active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              ⚡ Collect UPI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}