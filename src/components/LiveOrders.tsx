import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; 
import toast from 'react-hot-toast';

interface OrderItem { id: string; name: string; qty: number; price: number; }
interface Order { id: string; createdAt: string; paymentMode: string; kitchenStatus: string; total: number; token: number; tableId?: string; customerName: string; customerPhone?: string; items: OrderItem[]; }
interface MenuItem { id: string; name: string; price: number; category: string; }

export default function LiveOrders({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [expandedSegment, setExpandedSegment] = useState<'NEW' | 'PREP' | 'HISTORY' | null>(null);
  const [loading, setLoading] = useState(true);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [posCart, setPosCart] = useState<OrderItem[]>([]);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [activePromo, setActivePromo] = useState<any | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  const fetchData = async () => {
    try {
      const token = await getToken(); 
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const liveRes = await fetch(`${API_URL}/api/vendors/${vendorId}/kitchen-queue`, { headers });
      const histRes = await fetch(`${API_URL}/api/vendors/${vendorId}/sales`, { headers });
      if (liveRes.ok) setOrders((await liveRes.json()).orders);
      if (histRes.ok) setHistoryOrders((await histRes.json()).orders);

      if (menuItems.length === 0) {
        const menuRes = await fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, { headers });
        const promoRes = await fetch(`${API_URL}/api/vendors/${vendorId}/promos`, { headers });
        if (menuRes.ok) setMenuItems((await menuRes.json()).items || []);
        if (promoRes.ok) {
          const promoData = await promoRes.json();
          setActivePromo(promoData.promos?.find((p: any) => p.isActive) || null);
        }
      }
    } catch (err) {
      console.error("Data sync failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  const filteredMenu = menuItems.filter(item => item.name.toLowerCase().startsWith(searchTerm.toLowerCase()));

  const addToPos = (item: MenuItem) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromPos = (itemId: string) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const rawTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let finalTotal = rawTotal;
  if (applyDiscount && activePromo && rawTotal >= activePromo.minOrderValue) {
    const discountAmt = activePromo.type === 'FLAT' ? activePromo.value : (rawTotal * activePromo.value) / 100;
    finalTotal = Math.max(0, rawTotal - discountAmt);
  }

  const handleClearPos = () => { setPosCart([]); setReference(''); setPhone(''); setApplyDiscount(false); };

  const submitManualOrder = async (paymentMode: 'CASH' | 'UPI') => {
    if (posCart.length === 0) return toast.error("Cart is empty!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId, tableId: "Counter", customerName: reference.trim() || "Counter Order",
          customerPhone: phone.trim().length === 10 ? phone.trim() : "0000000000",
          paymentMode, total: finalTotal, items: posCart.map(c => ({ name: c.name, qty: c.qty, price: c.price }))
        })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Token #${data.tokenNumber} Created!`);
        handleClearPos();
        fetchData();
      }
    } catch (err) { toast.error("Checkout failed"); } 
    finally { setIsSubmitting(false); }
  };

  const updateStatus = async (orderId: string, status: string, isVerify = false) => {
    try {
      const token = await getToken(); 
      const res = await fetch(`${API_URL}/api/orders/${orderId}/kitchen-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        if (isVerify) toast.success("Payment verified!");
        else if (status === 'completed') toast.success("Order Ready!");
        else if (status === 'cancelled') toast.error("Order Cancelled.");
        fetchData(); 
      }
    } catch (err) { toast.error("Update failed"); }
  };

  // 🎨 ULTRA-COMPRESSED CARD RENDERER
  const renderCard = (order: Order, segment: 'NEW' | 'PREP' | 'HISTORY') => {
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <div key={order.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-2 flex flex-col justify-between shadow-md h-full relative overflow-hidden">
        <div className="flex justify-between items-start mb-1 border-b border-gray-800/50 pb-1">
          <div>
            <span className="text-xl font-black text-white leading-none">#{order.token}</span>
            <p className="text-[9px] text-gray-500 mt-0.5 font-bold uppercase truncate w-20">{order.customerName}</p>
          </div>
          <div className="text-right">
            <span className="text-[#E5B35C] font-bold text-xs">₹{order.total}</span>
            <p className="text-[8px] text-gray-500">{time}</p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col justify-center">
          {order.items.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex justify-between text-[10px] text-gray-300">
              <span className="truncate pr-1">{item.name}</span>
              <span className="font-bold text-gray-500">x{item.qty}</span>
            </div>
          ))}
          {order.items.length > 2 && <span className="text-[9px] text-gray-600 italic">+{order.items.length - 2} more...</span>}
        </div>
        <div className="mt-1 pt-1 border-t border-gray-800/50 shrink-0">
          {segment === 'NEW' && (
            <button onClick={() => updateStatus(order.id, 'preparing', order.paymentMode === 'UPI')} className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors">
              Start Prep
            </button>
          )}
          {segment === 'PREP' && (
            <div className="flex gap-1">
              <button onClick={() => updateStatus(order.id, 'cancelled')} className="w-1/3 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-500 text-[10px] font-bold rounded-lg transition-colors">Cancel</button>
              <button onClick={() => updateStatus(order.id, 'completed')} className="w-2/3 py-1.5 bg-[#E5B35C] hover:bg-yellow-400 text-black text-[10px] font-bold rounded-lg transition-colors">Mark Ready</button>
            </div>
          )}
          {segment === 'HISTORY' && (
            <div className="w-full py-1 bg-gray-800 text-gray-400 text-[9px] font-bold rounded text-center cursor-default">Completed</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-gray-400 p-8 font-bold tracking-widest uppercase">Loading Terminal...</div>;

  const newOrders = orders.filter(o => o.kitchenStatus === 'pending');
  const prepOrders = orders.filter(o => o.kitchenStatus === 'preparing');

  return (
    <div className="h-[100dvh] w-full bg-[#0B0E14] flex gap-2 overflow-hidden p-2 box-border">
      
      {/* 🚀 LEFT COLUMN: THE 3-SEGMENT HORIZONTAL KDS */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
        
        {/* ROW 1: NEW */}
        <div className="flex-1 flex flex-col bg-[#0A0C10] rounded-xl border border-gray-800/40 p-2 min-h-0">
          <h3 className="text-xs font-bold text-blue-500 mb-1 flex items-center shrink-0">NEW <span className="bg-blue-500/20 px-1.5 py-0.5 rounded text-[10px] ml-2">{newOrders.length}</span></h3>
          <div className="flex-1 grid grid-cols-4 gap-2 min-h-0 w-full">
            {newOrders.slice(0, 3).map(order => <div key={order.id} className="h-full">{renderCard(order, 'NEW')}</div>)}
            {newOrders.length === 0 && <div className="col-span-4 m-auto text-gray-600 font-bold uppercase text-[10px]">No New Orders</div>}
            {newOrders.length > 3 && (
              <button onClick={() => setExpandedSegment('NEW')} className="h-full bg-blue-900/30 border border-blue-500/30 text-blue-400 font-black rounded-lg flex flex-col items-center justify-center active:scale-95">
                <span className="text-2xl">+{newOrders.length - 3}</span><span className="text-[9px] mt-0.5 font-bold tracking-widest">MORE</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: PREPARING */}
        <div className="flex-1 flex flex-col bg-[#0A0C10] rounded-xl border border-gray-800/40 p-2 min-h-0">
          <h3 className="text-xs font-bold text-[#E5B35C] mb-1 flex items-center shrink-0">PREPARING <span className="bg-[#E5B35C]/20 px-1.5 py-0.5 rounded text-[10px] ml-2">{prepOrders.length}</span></h3>
          <div className="flex-1 grid grid-cols-4 gap-2 min-h-0 w-full">
            {prepOrders.slice(0, 3).map(order => <div key={order.id} className="h-full">{renderCard(order, 'PREP')}</div>)}
            {prepOrders.length === 0 && <div className="col-span-4 m-auto text-gray-600 font-bold uppercase text-[10px]">Grill is empty</div>}
            {prepOrders.length > 3 && (
              <button onClick={() => setExpandedSegment('PREP')} className="h-full bg-[#E5B35C]/10 border border-[#E5B35C]/30 text-[#E5B35C] font-black rounded-lg flex flex-col items-center justify-center active:scale-95">
                <span className="text-2xl">+{prepOrders.length - 3}</span><span className="text-[9px] mt-0.5 font-bold tracking-widest">MORE</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 3: HISTORY */}
        <div className="flex-1 flex flex-col bg-[#0A0C10] rounded-xl border border-gray-800/40 p-2 min-h-0">
          <h3 className="text-xs font-bold text-gray-400 mb-1 flex items-center shrink-0">HISTORY <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] ml-2">{historyOrders.length}</span></h3>
          <div className="flex-1 grid grid-cols-4 gap-2 min-h-0 w-full">
            {historyOrders.slice(0, 3).map(order => <div key={order.id} className="h-full opacity-70">{renderCard(order, 'HISTORY')}</div>)}
            {historyOrders.length === 0 && <div className="col-span-4 m-auto text-gray-600 font-bold uppercase text-[10px]">No history yet</div>}
            {historyOrders.length > 3 && (
              <button onClick={() => setExpandedSegment('HISTORY')} className="h-full bg-gray-800 border border-gray-700 text-gray-400 font-black rounded-lg flex flex-col items-center justify-center active:scale-95">
                <span className="text-2xl">+{historyOrders.length - 3}</span><span className="text-[9px] mt-0.5 font-bold tracking-widest">MORE</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 RIGHT COLUMN: THE NEW QUICK POS */}
      <div className="w-72 shrink-0 bg-[#0A0C10] border border-gray-800/40 rounded-xl p-3 flex flex-col min-h-0 relative">
        <h2 className="text-white font-black text-sm mb-2 flex items-center gap-1.5 shrink-0">
          <span>⚡</span> Walk-Up
        </h2>

        {/* FLOATING AUTOCOMPLETE SEARCH */}
        <div className="relative mb-2 z-50 shrink-0">
          <input 
            type="text" 
            placeholder="Search dish (e.g. 'T')..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1D24] text-xs text-white p-2 rounded-lg border border-gray-800 outline-none focus:border-[#E5B35C] shadow-inner"
          />
          {searchTerm && (
            <div className="absolute top-full left-0 w-full mt-1 bg-[#13161F] border border-gray-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
              {filteredMenu.length === 0 ? (
                <div className="p-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">No match</div>
              ) : (
                filteredMenu.map(item => (
                  <button key={item.id} onClick={() => { addToPos(item); setSearchTerm(''); }} className="w-full text-left p-2 border-b border-gray-800/50 hover:bg-gray-800 flex justify-between items-center transition-colors">
                    <span className="text-xs font-bold text-gray-200 truncate pr-2">{item.name}</span>
                    <span className="text-[10px] text-[#E5B35C] font-mono shrink-0">₹{item.price}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <input type="text" placeholder="Identifier (e.g. Red Shirt)" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full shrink-0 bg-[#1A1D24] text-[11px] text-white p-2 rounded-lg border border-gray-800 mb-1.5 outline-none focus:border-[#E5B35C]" />
        <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} className="w-full shrink-0 bg-[#1A1D24] text-[11px] text-white p-2 rounded-lg border border-gray-800 mb-2 outline-none focus:border-[#E5B35C]" />

        {/* CART LIST */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 no-scrollbar pr-1 mb-2">
          {posCart.length === 0 ? (
            <p className="text-gray-700 text-[10px] text-center mt-4 uppercase tracking-widest font-black">Cart is empty</p>
          ) : (
            posCart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px] text-gray-300 bg-[#1A1D24] p-1.5 rounded-lg border border-gray-800/50">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => removeFromPos(item.id)} className="w-5 h-5 bg-red-900/30 text-red-500 rounded font-black active:scale-90 border border-red-900/50 hover:bg-red-900/50 leading-none">−</button>
                  <span className="font-bold text-[#E5B35C] w-3 text-center">{item.qty}x</span>
                  <span className="font-medium line-clamp-1 w-20">{item.name}</span>
                </div>
                <span className="font-bold">₹{item.price * item.qty}</span>
              </div>
            ))
          )}
        </div>

        {/* CHECKOUT BLOCK */}
        <div className="shrink-0 pt-2 border-t border-gray-800/50">
          {activePromo && rawTotal >= activePromo.minOrderValue && (
            <div onClick={() => setApplyDiscount(!applyDiscount)} className="flex justify-between items-center bg-[#1A1D24] p-1.5 rounded-lg border border-gray-800 mb-2 cursor-pointer">
              <span className="text-[9px] font-bold text-[#E5B35C] uppercase">Apply {activePromo.code}</span>
              <div className={`w-6 h-3 rounded-full flex items-center p-0.5 transition-colors ${applyDiscount ? 'bg-green-500' : 'bg-gray-700'}`}>
                <div className={`w-2 h-2 bg-white rounded-full transform transition-transform ${applyDiscount ? 'translate-x-3' : ''}`}></div>
              </div>
            </div>
          )}

          <div className="mb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Total</span>
              {posCart.length > 0 && <button onClick={handleClearPos} className="bg-red-900/20 text-red-500 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-red-900/50 active:scale-95">Clear</button>}
            </div>
            <div className="text-right">
              {applyDiscount && activePromo && rawTotal >= activePromo.minOrderValue && <span className="text-gray-600 text-[10px] line-through mr-1.5">₹{rawTotal}</span>}
              <span className="text-[#E5B35C] text-lg font-black leading-none">₹{finalTotal}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={isSubmitting || posCart.length === 0} onClick={() => submitManualOrder('CASH')} className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-lg text-[11px] hover:bg-gray-700 disabled:opacity-50 active:scale-95">💵 CASH</button>
            <button disabled={isSubmitting || posCart.length === 0} onClick={() => submitManualOrder('UPI')} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-[11px] hover:bg-blue-700 disabled:opacity-50 active:scale-95">⚡ UPI</button>
          </div>
        </div>
      </div>

      {/* 🚀 MODAL */}
      {expandedSegment && (
        <div className="fixed inset-0 bg-[#0B0E14] z-50 flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-800">
            <h2 className="text-2xl font-black text-white">{expandedSegment} ORDERS</h2>
            <button onClick={() => setExpandedSegment(null)} className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full font-black text-lg flex items-center justify-center shadow-lg active:scale-90">✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto pb-10">
            {(expandedSegment === 'NEW' ? newOrders : expandedSegment === 'PREP' ? prepOrders : historyOrders).map(order => renderCard(order, expandedSegment))}
          </div>
        </div>
      )}
    </div>
  );
}