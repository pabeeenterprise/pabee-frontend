import { useState, useEffect } from 'react';

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
  items: OrderItem[];
}

export default function LiveOrders({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/kitchen-queue`, {
            cache: 'no-store' // 👈 This forces the browser to fetch fresh data every time!
          });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/kitchen-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchOrders(); 
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-gray-400 p-8 animate-pulse">Loading kitchen queue...</div>;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <h2 className="text-sm font-bold text-gray-500 tracking-wider mb-2 uppercase">Live Order Queue</h2>
      
      {orders.length === 0 ? (
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-8 text-center text-gray-500">
          No active orders. Kitchen is clear!
        </div>
      ) : (
        orders.map((order, index) => (
          <div key={order.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-serif text-white">Token #{index + 1}</h3>
                {order.kitchenStatus === 'pending' && <span className="bg-[#3D2C1D] text-[#E5B35C] px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border border-[#E5B35C]/30">New</span>}
              </div>
              <p className="text-xs text-gray-500 mb-3">Just now • {order.paymentMode}</p>
              
              <div className="text-gray-300 text-sm">
                {order.items.map(item => (
                  <span key={item.id}>{item.name} <span className="text-gray-500">x{item.qty}</span>{', '}</span>
                ))}
              </div>
              <div className="text-[#E5B35C] font-bold mt-2 text-lg">₹{order.total}</div>
            </div>

            <div className="flex gap-3 mt-4 md:mt-0">
              {order.kitchenStatus === 'pending' ? (
                <>
                  <button className="px-4 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-lg text-sm hover:text-white hover:border-gray-400 transition-colors font-medium">
                    Print KOT
                  </button>
                  <button 
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="px-5 py-2 bg-[#E5B35C]/10 border border-[#E5B35C]/50 text-[#E5B35C] rounded-lg text-sm hover:bg-[#E5B35C] hover:text-[#0B0E14] transition-all font-bold"
                  >
                    Start prep
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => updateStatus(order.id, 'completed')}
                  className="px-6 py-2 bg-[#1C3A27] text-[#4ADE80] border border-[#4ADE80]/30 rounded-lg text-sm hover:bg-[#254f35] transition-colors font-bold tracking-wide"
                >
                  Mark Ready
                </button>
              )}
            </div>
            
          </div>
        ))
      )}
    </div>
  );
}