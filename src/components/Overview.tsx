import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  total: number;
  items: OrderItem[];
  createdAt?: string | Date; 
  created_at?: string | Date;
}

export default function Overview({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Data
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/sales`, {
            cache: 'no-store' // 👈 This forces the browser to fetch fresh data every time!
          });
          if (res.ok) {
            const data = await res.json();
            // 👇 CHANGED: Safely accepts 'orders', 'sales', 'data', or a flat array
            const ordersArray = Array.isArray(data) ? data : (data.orders || data.sales || data.data || []);
            setOrders(ordersArray);
          }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  // 2. THE MATH ENGINE
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Safely filter orders for today
    const todaysOrders = orders.filter(order => {
      const dateString = order.createdAt || order.created_at; 
      if (!dateString) return false;
      const orderDate = new Date(dateString).getTime();
      return orderDate >= startOfToday;
    });

    const ordersToday = todaysOrders.length;
    const todayRevenue = todaysOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const avgOrderValue = ordersToday > 0 ? (todayRevenue / ordersToday) : 0;

    const hourlyDataMap: Record<number, number> = {};
    for (let i = 9; i <= 23; i++) {
      hourlyDataMap[i] = 0;
    }

    todaysOrders.forEach(order => {
      const dateString = order.createdAt || order.created_at;
      const hour = new Date(dateString as string | Date).getHours();
      if (hourlyDataMap[hour] !== undefined) {
        hourlyDataMap[hour] += Number(order.total) || 0;
      }
    });

    const hourlyChartData = Object.keys(hourlyDataMap).map(hour => ({
      time: `${Number(hour) > 12 ? Number(hour) - 12 : hour} ${Number(hour) >= 12 ? 'PM' : 'AM'}`,
      revenue: hourlyDataMap[Number(hour)]
    }));

    const itemMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    todaysOrders.forEach(order => {
      let itemsArray = order.items;
      if (typeof itemsArray === 'string') {
        try { itemsArray = JSON.parse(itemsArray); } catch(e) { itemsArray = []; }
      }

      (itemsArray || []).forEach((item: OrderItem) => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        const quantitySold = Number(item.qty) || 1;
        itemMap[item.name].quantity += quantitySold;
        itemMap[item.name].revenue += ((Number(item.price) || 0) * quantitySold);
      });
    });

    const topSellingItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4);

    return { todayRevenue, ordersToday, avgOrderValue, hourlyChartData, topSellingItems };
  }, [orders]);

  if (isLoading) {
    return <div className="p-10 text-gray-500 animate-pulse">Calculating today's metrics...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      
      {/* TOP METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#13161F] p-6 rounded-xl border border-gray-800 shadow-sm">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Today's Revenue</h3>
          <p className="text-3xl font-bold text-white">₹{metrics.todayRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-[#13161F] p-6 rounded-xl border border-gray-800 shadow-sm">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Orders Today</h3>
          <p className="text-3xl font-bold text-white">{metrics.ordersToday}</p>
        </div>
        <div className="bg-[#13161F] p-6 rounded-xl border border-gray-800 shadow-sm">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Avg Order Value</h3>
          <p className="text-3xl font-bold text-white">₹{metrics.avgOrderValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* HOURLY REVENUE CHART */}
        <div className="lg:col-span-2 bg-[#13161F] p-6 rounded-xl border border-gray-800 shadow-sm">
          <h3 className="text-white font-bold mb-6">Hourly Revenue Today</h3>
          <div className="w-full" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2330" vertical={false} />
                <XAxis dataKey="time" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  cursor={{ fill: '#1F2330' }}
                  contentStyle={{ backgroundColor: '#0B0E14', borderColor: '#1F2330', color: '#fff' }}
                  itemStyle={{ color: '#E5B35C' }}
                />
                <Bar dataKey="revenue" fill="#E5B35C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP SELLING ITEMS */}
        <div className="bg-[#13161F] p-6 rounded-xl border border-gray-800 shadow-sm">
          <h3 className="text-white font-bold mb-6">Top Selling Items Today</h3>
          
          {metrics.topSellingItems.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-10">No items sold yet today.</p>
          ) : (
            <div className="space-y-4">
              {metrics.topSellingItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-[#0B0E14] p-3 rounded-lg border border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#1F2330] text-[#E5B35C] font-bold w-8 h-8 rounded flex items-center justify-center text-xs">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">₹{item.revenue.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}