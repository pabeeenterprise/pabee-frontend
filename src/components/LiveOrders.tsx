import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; 
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
}

interface Order {
  id: string;
  createdAt: string;
  paymentMode: string;
  kitchenStatus: 'pending' | 'preparing' | 'completed' | 'cancelled';
  total: number;
  token: number;
  tableId?: string;    
  customerName: string;   
  customerPhone?: string; 
  items: OrderItem[];
}

export default function LiveOrders({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 THE FULL-SCREEN MODAL STATE
  const [expandedSegment, setExpandedSegment] = useState<'NEW' | 'PREP' | 'HISTORY' | null>(null);
  
  const { getToken } = useAuth();

  const fetchOrders = async () => {
    try {
      const token = await getToken(); 
      const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
      
      const liveRes = await fetch(`${API_URL}/api/vendors/${vendorId}/kitchen-queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const histRes = await fetch(`${API_URL}/api/vendors/${vendorId}/sales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (liveRes.ok && histRes.ok) {
        const liveData = await liveRes.json();
        const histData = await histRes.json();
        setOrders(liveData.orders);
        setHistoryOrders(histData.orders);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  const updateStatus = async (orderId: string, status: string, isPaymentVerification = false) => {
    try {
      const token = await getToken(); 
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/kitchen-status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        if (isPaymentVerification) toast.success("Payment verified & cooking started!");
        if (status === 'completed') toast.success("Order Ready!");
        if (status === 'cancelled') toast.error("Order Cancelled.");
        fetchOrders(); 
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  if (loading) return <div className="text-gray-400 p-8 animate-pulse font-bold tracking-widest uppercase">Loading Static Grid...</div>;

  // 🧠 SEGMENT SORTING
  const newOrders = orders.filter(o => o.kitchenStatus === 'pending');
  const prepOrders = orders.filter(o => o.kitchenStatus === 'preparing');
  const completedOrders = historyOrders; // From the sales endpoint

  // 🎨 COMPACT CARD RENDERER (Built specifically to prevent scrolling)
  const renderCard = (order: Order, segment: 'NEW' | 'PREP' | 'HISTORY') => {
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <div key={order.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-3 flex flex-col justify-between shadow-md h-full relative overflow-hidden">
        
        {/* Top: Token & Info */}
        <div className="flex justify-between items-start mb-2 border-b border-gray-800/50 pb-2">
          <div>
            <span className="text-2xl font-black text-white leading-none">#{order.token}</span>
            <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase truncate w-24">{order.customerName}</p>
          </div>
          <div className="text-right">
            <span className="text-[#E5B35C] font-bold text-sm">₹{order.total}</span>
            <p className="text-[9px] text-gray-500">{time}</p>
          </div>
        </div>

        {/* Middle: Items (Truncated to fit static height) */}
        <div className="flex-1 overflow-hidden min-h-[40px]">
          {order.items.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-gray-300">
              <span className="truncate pr-2">{item.name}</span>
              <span className="font-bold text-gray-500">x{item.qty}</span>
            </div>
          ))}
          {order.items.length > 2 && <span className="text-[10px] text-gray-600 italic">+{order.items.length - 2} more items...</span>}
        </div>

        {/* Bottom: Segment-Specific Actions */}
        <div className="mt-2 pt-2 border-t border-gray-800/50">
          {segment === 'NEW' && (
            <button onClick={() => updateStatus(order.id, 'preparing', order.paymentMode === 'UPI')} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
              Start Preparation
            </button>
          )}
          
          {segment === 'PREP' && (
            <div className="flex gap-2">
              <button onClick={() => updateStatus(order.id, 'cancelled')} className="w-1/3 py-2 bg-red-900/40 hover:bg-red-900 text-red-500 text-xs font-bold rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={() => updateStatus(order.id, 'completed')} className="w-2/3 py-2 bg-[#E5B35C] hover:bg-yellow-400 text-black text-xs font-bold rounded-lg transition-colors">
                Mark Ready
              </button>
            </div>
          )}

          {segment === 'HISTORY' && (
            <div className="w-full py-2 bg-gray-800 text-gray-400 text-xs font-bold rounded-lg text-center cursor-default">
              Completed
            </div>
          )}
        </div>
      </div>
    );
  };

  // 🚀 FULL SCREEN MODAL RENDERER
  const renderModal = () => {
    if (!expandedSegment) return null;
    
    let activeData: Order[] = [];
    let title = "";
    
    if (expandedSegment === 'NEW') { activeData = newOrders; title = "All New Orders"; }
    if (expandedSegment === 'PREP') { activeData = prepOrders; title = "All Preparing Orders"; }
    if (expandedSegment === 'HISTORY') { activeData = completedOrders; title = "Today's History"; }

    return (
      <div className="fixed inset-0 bg-[#0B0E14] z-50 flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
          <h2 className="text-3xl font-black text-white">{title} ({activeData.length})</h2>
          <button onClick={() => setExpandedSegment(null)} className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full font-black text-xl flex items-center justify-center shadow-lg transition-transform active:scale-90">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
          {activeData.map(order => renderCard(order, expandedSegment))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#0B0E14] flex flex-col overflow-hidden p-4">
      {renderModal()}

      {/* HEADER */}
      <div className="shrink-0 mb-4 pb-2 border-b border-gray-800 flex justify-between items-end">
        <h1 className="text-xl font-black text-white tracking-tight">Static KDS</h1>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{orders.length + historyOrders.length} Total Today</span>
      </div>

      {/* 🚀 THE 3-SEGMENT STATIC GRID (HORIZONTAL ROWS) */}
      <div className="flex-1 grid grid-rows-3 gap-4 min-h-0">
        
        {/* ROW 1: NEW */}
        <div className="flex flex-col bg-[#0A0C10] rounded-2xl border border-gray-800/40 p-3 h-full min-h-0">
          <h3 className="text-sm font-bold text-blue-500 mb-2 flex items-center shrink-0">
            NEW <span className="bg-blue-500/20 px-2 py-0.5 rounded text-xs ml-2">{newOrders.length}</span>
          </h3>
          {/* 🧠 Strict 4-Slot Grid prevents horizontal stretching */}
          <div className="flex-1 grid grid-cols-4 gap-3 min-h-0 w-full">
            {newOrders.slice(0, 3).map(order => (
              <div key={order.id} className="h-full">{renderCard(order, 'NEW')}</div>
            ))}
            
            {newOrders.length === 0 && <div className="col-span-4 m-auto text-gray-600 font-bold uppercase text-xs">No New Orders</div>}
            
            {/* SLOT 4: THE +X BUTTON */}
            {newOrders.length > 3 && (
              <button onClick={() => setExpandedSegment('NEW')} className="h-full bg-blue-900/30 border border-blue-500/30 text-blue-400 font-black rounded-xl hover:bg-blue-900/50 transition-colors flex flex-col items-center justify-center">
                <span className="text-3xl">+{newOrders.length - 3}</span>
                <span className="text-[10px] mt-1 font-bold tracking-widest">MORE</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: PREPARING */}
        <div className="flex flex-col bg-[#0A0C10] rounded-2xl border border-gray-800/40 p-3 h-full min-h-0">
          <h3 className="text-sm font-bold text-[#E5B35C] mb-2 flex items-center shrink-0">
            PREPARING <span className="bg-[#E5B35C]/20 px-2 py-0.5 rounded text-xs ml-2">{prepOrders.length}</span>
          </h3>
          <div className="flex-1 grid grid-cols-4 gap-3 min-h-0 w-full">
            {prepOrders.slice(0, 3).map(order => (
              <div key={order.id} className="h-full">{renderCard(order, 'PREP')}</div>
            ))}
            
            {prepOrders.length === 0 && <div className="col-span-4 m-auto text-gray-600 font-bold uppercase text-xs">Grill is empty</div>}
            
            {/* SLOT 4: THE +X BUTTON */}
            {prepOrders.length > 3 && (
              <button onClick={() => setExpandedSegment('PREP')} className="h-full bg-[#E5B35C]/10 border border-[#E5B35C]/30 text-[#E5B35C] font-black rounded-xl hover:bg-[#E5B35C]/20 transition-colors flex flex-col items-center justify-center">
                <span className="text-3xl">+{prepOrders.length - 3}</span>
                <span className="text-[10px] mt-1 font-bold tracking-widest">MORE</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 3: HISTORY */}
        <div className="flex flex-col bg-[#0A0C10] rounded-2xl border border-gray-800/40 p-3 h-full min-h-0">
          <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center shrink-0">
            HISTORY <span className="bg-gray-800 px-2 py-0.5 rounded text-xs ml-2">{completedOrders.length}</span>
          </h3>
          <div className="flex-1 grid grid-cols-4 gap-3 min-h-0 w-full">
            {completedOrders.slice(0, 3).map(order => (
              <div key={order.id} className="h-full opacity-70">{renderCard(order, 'HISTORY')}</div>
            ))}
            
            {completedOrders.length === 0 && <div className="col-span-4 m-auto text-gray-600 font-bold uppercase text-xs">No history yet</div>}
            
            {/* SLOT 4: THE +X BUTTON */}
            {completedOrders.length > 3 && (
              <button onClick={() => setExpandedSegment('HISTORY')} className="h-full bg-gray-800 border border-gray-700 text-gray-400 font-black rounded-xl hover:bg-gray-700 transition-colors flex flex-col items-center justify-center">
                <span className="text-3xl">+{completedOrders.length - 3}</span>
                <span className="text-[10px] mt-1 font-bold tracking-widest">MORE</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}