import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { playOrderAlert } from '../utils/soundAlerts';

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

interface LiveOrdersProps {
  vendorId: string;
  mode?: string;
  soundEnabled?: boolean;
}

export default function LiveOrders({ vendorId, soundEnabled = true }: LiveOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueTab, setQueueTab] = useState<'active' | 'history'>('active');

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
  const prevOrderCountRef = useRef<number>(0);

  // Audio chime for incoming tickets
  const playRing = () => {
    if (!soundEnabled) return;
    playOrderAlert();
  };

  // 1. Fetch only pending/preparing kitchen tickets every 5 seconds
  const fetchActiveQueue = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/kitchen-queue`, { headers });
      if (res.ok) {
        const liveData = await res.json();
        const incomingOrders: Order[] = liveData.orders || [];

        if (prevOrderCountRef.current > 0 && incomingOrders.length > prevOrderCountRef.current) {
          playRing();
        }
        prevOrderCountRef.current = incomingOrders.length;
        setOrders(incomingOrders);
      }
    } catch (err) {
      console.error('Active queue poll failed', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch completed orders strictly on demand
  const fetchHistory = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/sales`, {
        headers,
        cache: 'no-store',
      });
      if (res.ok) {
        const histData = await res.json();
        setHistoryOrders(histData.orders || []);
      }
    } catch (err) {
      console.error('History fetch failed', err);
    }
  };

  // Run the 5s interval exclusively on active kitchen tickets
  useEffect(() => {
    fetchActiveQueue();
    const interval = setInterval(fetchActiveQueue, 5000);
    return () => clearInterval(interval);
  }, [vendorId]);

  // Load history strictly when the cook taps the "Completed History" tab
  useEffect(() => {
    if (queueTab === 'history') {
      fetchHistory();
    }
  }, [queueTab]);

  // "To Make Now" Aggregation Across All Unfinished Orders
  const toMakeAggregation = useMemo((): [string, number][] => {
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

  const getAgeMinutes = (createdAt: string): number => {
    return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
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
        if (status === 'preparing') {
          toast.success('Cooking started 🔥');
        } else if (status === 'completed') {
          toast.success('Order marked ready ✅');
          fetchHistory();
        } else if (status === 'cancelled') {
          toast.error('Order cancelled & stock restored');
        }
        fetchActiveQueue();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Loading kitchen terminal…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121110] text-[#F5F0E8] overflow-hidden">
      
      {/* 1. Aggregate "To Make Now" Top Bar */}
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

      {/* 2. Sub-Tabs: Active vs History */}
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

      {/* 3. Ticket Display Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {queueTab === 'active' ? (
          orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#9A9184]">
              <span className="text-4xl mb-2">🍽️</span>
              <p className="font-semibold text-base">All orders completed</p>
              <p className="text-xs text-[#5C554B]">New orders will ring automatically</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {orders.map((order) => {
                const ageMins = getAgeMinutes(order.createdAt);
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

                      {/* Customer Name & Cook Notes */}
                      <div className="py-1.5 text-xs text-[#C7BFB2] font-semibold truncate">
                        {order.customerName}
                      </div>

                      {/* Items */}
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

                    {/* Progression Actions */}
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
              <div className="p-8 text-center text-[#9A9184] text-sm">
                No completed orders yet today.
              </div>
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