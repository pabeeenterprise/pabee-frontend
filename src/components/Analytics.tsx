import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; // 👈 IMPORTED HERE

// We will use this mock data until we build the complex backend aggregation route!
const MOCK_DATA = {
  revenue: "62,400",
  orders: 482,
  avgOrder: 129,
  rating: 4.6,
  paymentSplit: [
    { label: 'UPI / QR', percentage: 68, color: 'bg-blue-500' },
    { label: 'Cash', percentage: 28, color: 'bg-[#E5B35C]' },
    { label: 'Card', percentage: 4, color: 'bg-gray-500' }
  ],
  peakHours: [
    { label: '12–2 PM', percentage: 88 },
    { label: '6–8 PM', percentage: 95 },
    { label: '8–10 PM', percentage: 72 },
    { label: '9–11 AM', percentage: 48 }
  ],
  topItems: [
    { id: 1, name: 'Pav Bhaji', rev: '12,400', sold: 155 },
    { id: 2, name: 'Sev Puri', rev: '8,640', sold: 144 },
    { id: 3, name: 'Vada Pav', rev: '6,000', sold: 240 },
    { id: 4, name: 'Bhel Puri', rev: '4,800', sold: 96 },
    { id: 5, name: 'Masala Chai', rev: '2,400', sold: 120 }
  ],
  // 30 random heights for our beautiful green trend chart
  trend: [30, 45, 35, 50, 40, 60, 55, 75, 50, 45, 65, 70, 55, 80, 85, 60, 50, 75, 90, 85, 70, 80, 95, 85, 100, 90, 75, 85, 95, 80]
};

export default function Analytics({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(false); 
  
  const { getToken } = useAuth(); // 👈 HOOK INITIALIZED HERE

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true); 
      try {
        const token = await getToken(); // 👈 GRAB TOKEN
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` } // 👈 ATTACH TOKEN
        });
        
        if (res.ok) {
          const realData = await res.json();
          setData(realData); 
        }
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setIsLoading(false); 
      }
    };

    if (vendorId) fetchAnalytics();
  }, [vendorId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#E5B35C] animate-pulse font-bold tracking-widest uppercase">Crunching Numbers...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Analytics</h1>
          <p className="text-xs text-gray-500">Sales • Items • Payment • Peak hours</p>
        </div>
        <button className="border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-all">
          Export
        </button>
      </div>

      {/* TOP 4 METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-lg">
          <h3 className="text-3xl font-bold text-[#E5B35C] mb-1">₹{data.revenue}</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">This Month</p>
          <p className="text-xs font-bold text-green-400">↑ 22%</p>
        </div>

        {/* Orders */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-lg">
          <h3 className="text-3xl font-bold text-[#E5B35C] mb-1">{data.orders}</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Orders (Month)</p>
        </div>

        {/* Avg Order */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-lg">
          <h3 className="text-3xl font-bold text-[#E5B35C] mb-1">₹{data.avgOrder}</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Avg Order</p>
        </div>

        {/* Rating */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-lg">
          <h3 className="text-3xl font-bold text-[#E5B35C] mb-1">{data.rating}</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Customer Rating</p>
        </div>
      </div>

      {/* MIDDLE SECTION: PROGRESS BARS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Split */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-lg">
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6">Payment Split</h3>
          <div className="flex flex-col gap-5">
            {data.paymentSplit.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>{item.label}</span>
                  <span className="text-gray-500 font-mono">{item.percentage}%</span>
                </div>
                <div className="w-full bg-[#1A1D24] rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-lg">
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6">Peak Hours (This Week)</h3>
          <div className="flex flex-col gap-5">
            {data.peakHours.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-xs text-gray-400 w-16">{item.label}</span>
                <div className="flex-1 bg-[#1A1D24] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-[#E5B35C] rounded-full" style={{ width: `${item.percentage}%` }}></div>
                </div>
                <span className="text-xs text-[#E5B35C] font-mono w-8 text-right">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: LISTS & CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Items */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-lg flex flex-col">
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6">Top Items By Revenue</h3>
          <div className="flex flex-col gap-4 flex-1 justify-between">
            {data.topItems.map((item, i) => (
              <div key={item.id} className={`flex items-center justify-between pb-3 ${i !== data.topItems.length - 1 ? 'border-b border-[#1F2330]' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="text-[#E5B35C] font-bold text-sm w-4">{i + 1}</span>
                  <span className="text-gray-200 text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">₹{item.rev}</p>
                  <p className="text-[10px] text-gray-500">{item.sold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 30-Day Trend Chart */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-lg flex flex-col">
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6">30-Day Revenue Trend</h3>
          
          {/* Custom CSS Bar Chart! */}
          <div className="flex-1 flex items-end justify-between gap-1 mt-4 h-48 border-b border-[#1F2330] pb-2">
            {data.trend.map((height, i) => (
              <div 
                key={i} 
                className="w-full bg-[#1c3f25] hover:bg-[#288c42] transition-colors rounded-t-sm group relative"
                style={{ height: `${height}%` }}
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                  Day {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}