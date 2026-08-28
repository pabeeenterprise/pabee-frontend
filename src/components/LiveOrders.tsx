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
  kitchenStatus: 'pending' | 'preparing' | 'completed';
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
  const [activeTab, setActiveTab] = useState<'LIVE' | 'HISTORY'>('LIVE'); // 🚀 THE TAB STATE
  const { getToken } = useAuth();

  const fetchOrders = async () => {
    try {
      const token = await getToken(); 
      const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
      
      // Fetch Live Queue
      const liveRes = await fetch(`${API_URL}/api/vendors/${vendorId}/kitchen-queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch Completed History (Using your existing sales route)
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
      console.error("Queue fetch failed", err);
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
        if (status === 'completed') toast.success("Order Cleared to History");
        fetchOrders(); 
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  if (loading) return <div className="text-gray-400 p-8 animate-pulse font-bold tracking-widest uppercase">Loading Kitchen...</div>;

  // 🧠 PRIORITY SORTING
  const riskOrders = orders.filter(o => o.kitchenStatus === 'pending' && (o.paymentMode === 'UPI' || (o.paymentMode === 'CASH' && o.tableId !== 'Counter')));
  const standardOrders = orders.filter(o => !riskOrders.includes(o));
  const displayOrders = [...riskOrders, ...standardOrders];

  const getCardConfig = (order: Order) => {
    if (order.kitchenStatus === 'pending') {
      let label = 'New Paid Order'; let color = 'border-blue-500'; let text = 'text-blue-500'; let bg = 'bg-blue-500/10'; let icon = '🔥';
      if (order.paymentMode === 'CASH' && order.tableId !== 'Counter') {
         label = 'Collect Cash'; color = 'border-orange-500'; text = 'text-orange-500'; bg = 'bg-orange-500/10'; icon = '💵';
      } else if (order.paymentMode === 'UPI') {
         label = 'Verify UPI'; color = 'border-red-500'; text = 'text-red-500'; bg = 'bg-red-500/10'; icon = '⚡';
      }
      return { statusLabel: label, color, bg, text, icon, btnLabel: 'Accept & Cook', action: () => updateStatus(order.id, 'preparing', order.paymentMode === 'UPI' || order.paymentMode === 'CASH') };
    }
    return { statusLabel: 'Cooking', color: 'border-[#E5B35C]', bg: 'bg-[#E5B35C]/10', text: 'text-[#E5B35C]', icon: '🍳', btnLabel: 'Handed to Customer (Clear)', action: () => updateStatus(order.id, 'completed') };
  };

  return (
    <div className="flex flex-col w-full h-full">
      
      {/* 🚀 THE TAB NAVIGATION */}
      <div className="flex justify-between items-end mb-6 pb-2 border-b border-gray-800">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('LIVE')}
            className={`text-2xl font-black tracking-tight pb-2 transition-all ${activeTab === 'LIVE' ? 'text-white border-b-2 border-[#E5B35C]' : 'text-gray-600 hover:text-gray-400'}`}
          >
            Live Queue <span className="text-sm ml-1 bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{displayOrders.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`text-2xl font-black tracking-tight pb-2 transition-all ${activeTab === 'HISTORY' ? 'text-white border-b-2 border-[#E5B35C]' : 'text-gray-600 hover:text-gray-400'}`}
          >
            History <span className="text-sm ml-1 bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{historyOrders.length}</span>
          </button>
        </div>
      </div>

      {/* 🟢 TAB 1: LIVE QUEUE */}
      {activeTab === 'LIVE' && (
        displayOrders.length === 0 ? (
          <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-12 text-center text-gray-500 shadow-inner flex flex-col items-center">
            <span className="text-4xl mb-4 opacity-50">🍃</span>
            <span className="font-bold tracking-widest uppercase">Grill is Empty</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-max pb-12">
            {displayOrders.map((order) => {
              const config = getCardConfig(order);
              const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={order.id} className={`bg-[#13161F] rounded-2xl border-l-4 ${config.color} border-y border-r border-[#1F2330] p-4 shadow-lg flex flex-col h-full transition-all relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none`}></div>
                  <div className="flex justify-between items-start relative z-10 mb-2">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${config.text}`}>{config.statusLabel}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-3xl font-black text-white">#{order.token}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <span className="text-[#E5B35C] font-black text-xl">₹{order.total}</span>
                       <span className="text-xs text-gray-500">{orderTime}</span>
                    </div>
                  </div>
                  <div className="relative z-10 flex-grow mb-5">
                    <div className="flex flex-col gap-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-sm">
                          <span className="font-medium text-gray-200 pr-4">{item.name}</span>
                          <span className="font-black text-gray-500">x{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto relative z-10">
                    <button onClick={config.action} className={`w-full py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-transform active:scale-95 ${config.bg} ${config.text} border border-current/20 hover:brightness-125`}>
                      <span className="text-lg">{config.icon}</span> {config.btnLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 🔴 TAB 2: HISTORY */}
      {activeTab === 'HISTORY' && (
        historyOrders.length === 0 ? (
          <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-12 text-center text-gray-500 shadow-inner flex flex-col items-center">
            <span className="font-bold tracking-widest uppercase">No completed orders yet today.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-max pb-12 opacity-80">
            {historyOrders.map((order) => {
              const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={order.id} className="bg-[#13161F] rounded-2xl border border-gray-800 p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2 border-b border-gray-800 pb-2">
                    <span className="text-2xl font-black text-gray-400">#{order.token}</span>
                    <div className="text-right flex flex-col items-end">
                       <span className="text-gray-400 font-black text-lg">₹{order.total}</span>
                       <span className="text-[10px] text-gray-500">{orderTime}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-gray-500">
                        <span>{item.name}</span>
                        <span>x{item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}