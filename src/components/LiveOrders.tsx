import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; 
import toast from 'react-hot-toast'; // 👈 1. Added toast for success/error messages

interface OrderItem {
  id: string;
  name: string;
  qty: number;
}

// 👈 2. Updated Interface to include table and phone data for the UI
interface Order {
  id: string;
  createdAt: string;
  paymentMode: string;
  kitchenStatus: 'pending' | 'preparing' | 'completed';
  total: number;
  tableId?: string;       
  customerPhone?: string; 
  items: OrderItem[];
}

export default function LiveOrders({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const fetchOrders = async () => {
    try {
      const token = await getToken(); 
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/kitchen-queue`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store' 
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

  // 👈 3. Secured Verification Function with Clerk Token
  const handleVerifyPayment = async (orderId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/kitchen-status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'preparing' }) // Moves it directly to prep
      });

      if (res.ok) {
        toast.success("Payment verified! Kitchen notified.");
        fetchOrders(); 
      } else {
        toast.error("Failed to verify payment.");
      }
    } catch (error) {
      toast.error("Network error while verifying payment.");
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const token = await getToken(); 
      await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/kitchen-status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      fetchOrders(); 
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-gray-400 p-8 animate-pulse">Loading kitchen queue...</div>;

  // 👈 4. Separate the queues logically
  const unverifiedUpiOrders = orders.filter(o => o.kitchenStatus === 'pending' && o.paymentMode === 'UPI');
  const standardOrders = orders.filter(o => !(o.kitchenStatus === 'pending' && o.paymentMode === 'UPI'));

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <h2 className="text-sm font-bold text-gray-500 tracking-wider mb-2 uppercase">Live Order Queue</h2>
      
      {/* ⚠️ PENDING PAYMENT VERIFICATION QUEUE */}
      {unverifiedUpiOrders.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl shadow-lg">
          <h2 className="text-red-400 font-bold mb-4 flex items-center gap-2">
            <span>⚠️</span> Action Required: Verify UPI Payments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unverifiedUpiOrders.map(order => (
              <div key={order.id} className="bg-[#13161F] border border-red-500/30 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xl font-bold text-white">{order.tableId || 'No Table'}</p>
                    <p className="text-xs text-gray-500">{order.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#E5B35C] font-bold text-lg">₹{order.total}</p>
                    <p className="text-[10px] uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full mt-1">UPI Declared</p>
                  </div>
                </div>

                <div className="text-sm text-gray-400 mb-4 bg-[#0B0E14] p-2 rounded-lg">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.qty}x {item.name}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleVerifyPayment(order.id)}
                  className="w-full bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  ✓ Verify Screen & Send to Kitchen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STANDARD KITCHEN QUEUE */}
      {standardOrders.length === 0 ? (
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-8 text-center text-gray-500">
          No active tickets. Kitchen is clear!
        </div>
      ) : (
        standardOrders.map((order, index) => (
          <div key={order.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-serif text-white">
                  {order.tableId ? order.tableId : `Token #${index + 1}`}
                </h3>
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