import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import RevenueTab, { AnalyticsData } from './analytics/RevenueTab';
import MenuMatrixTab from './analytics/MenuMatrixTab'; // 👈 1. Note: Removed the interface import from here

// 👈 2. Updated MOCK_DATA to satisfy the new interface requirement
const MOCK_DATA: AnalyticsData = {
  revenue: "324",
  orders: 2,
  avgOrder: 162,
  rating: 5.0,
  paymentSplit: [
    { label: 'UPI / QR', percentage: 50, color: 'bg-blue-500' },
    { label: 'Cash', percentage: 50, color: 'bg-[#E5B35C]' }
  ],
  topItems: [
    { id: 1, name: 'Pav Bhaji', sold: 2 },
    { id: 2, name: 'Sev Puri', sold: 2 },
    { id: 3, name: 'Masala Chai', sold: 1 }
  ],
  menuMatrix: {
    stars: [
      { name: 'Pav Bhaji', value: '65%' },
      { name: 'Sev Puri', value: '63%' }
    ],
    plowhorses: [],
    puzzles: [
      { name: 'Special Pav Bhaji', value: '64%' },
      { name: 'Vada Pav', value: '68%' },
      { name: 'Cheese Vada Pav', value: '63%' },
      { name: 'Bhel Puri', value: '64%' },
      { name: 'Dahi Puri', value: '64%' },
      { name: 'Masala Chai', value: '80%' },
      { name: 'Cold Coffee', value: '67%' },
      { name: 'Sugarcane Juice', value: '73%' }
    ],
    dogs: [],
    margins: [
      { name: 'Masala Chai', margin: 80 },
      { name: 'Sugarcane Juice', margin: 73 },
      { name: 'Vada Pav', margin: 68 },
      { name: 'Cold Coffee', margin: 67 },
      { name: 'Pav Bhaji', margin: 65 },
      { name: 'Dahi Puri', margin: 64 },
      { name: 'Bhel Puri', margin: 64 },
      { name: 'Special Pav Bhaji', margin: 64 },
      { name: 'Sev Puri', margin: 63 },
      { name: 'Cheese Vada Pav', margin: 63 }
    ]
  }
};

export default function Analytics({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState<AnalyticsData>(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(false); 
  const [activeTab, setActiveTab] = useState('revenue');
  
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true); 
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
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
          <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Business Intelligence</h1>
          <p className="text-xs text-gray-500">Real insights to grow your stall</p>
        </div>
        <button className="border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-all">
          Export
        </button>
      </div>

      {/* TOP 4 METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#13161F] border-t-2 border-t-[#E5B35C] border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md">
          <h2 className="text-3xl font-serif text-[#E5B35C] mb-1">₹{data.revenue}</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Today's Revenue</p>
          <p className="text-sm text-white font-medium">₹4,676 to target</p>
        </div>
        <div className="bg-[#13161F] border-t-2 border-t-orange-500 border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md">
          <h2 className="text-3xl font-serif text-white mb-1">{data.orders}</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Confirmed Orders</p>
          <p className="text-sm text-gray-400">0 cash pending</p>
        </div>
        <div className="bg-[#13161F] border-t-2 border-t-green-500 border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-serif text-green-500 mb-1">6%</h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Target Progress</p>
          </div>
          <div>
            <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-green-500 h-full rounded-full" style={{ width: `6%` }}></div>
            </div>
            <p className="text-xs text-gray-500">Target: ₹5,000 · <span className="text-gray-400 cursor-pointer hover:text-white">Change →</span></p>
          </div>
        </div>
        <div className="bg-[#13161F] border-t-2 border-t-blue-500 border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md">
          <h2 className="text-3xl font-serif text-blue-500 mb-1">50%</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">UPI Rate</p>
          <p className="text-sm text-gray-400">1 UPI · 1 cash</p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-[#1F2330] pb-px overflow-x-auto no-scrollbar mt-2">
        {[
          { id: 'revenue', icon: '📈', label: 'Revenue' },
          { id: 'menu-matrix', icon: '🍽️', label: 'Menu Matrix' },
          { id: 'heatmap', icon: '🔥', label: 'Heatmap' },
          { id: 'customers', icon: '👥', label: 'Customers' },
          { id: 'forecast', icon: '🔮', label: 'Forecast' },
          { id: 'insights', icon: '💡', label: 'Insights' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab.id 
                ? 'border-[#E5B35C] text-[#E5B35C]' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="opacity-80">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB ROUTING COMPONENT */}
      <div className="min-h-[400px]">
        {activeTab === 'revenue' && <RevenueTab data={data} />}
        
        {/* 👈 3. The Menu Matrix component is wired in here */}
        {activeTab === 'menu-matrix' && <MenuMatrixTab data={data.menuMatrix} />}
        
        {activeTab === 'heatmap' && <div className="text-gray-500 p-12 border border-dashed border-gray-800 rounded-xl text-center mt-4">Heatmap Component</div>}
        
        {activeTab === 'customers' && <div className="text-gray-500 p-12 border border-dashed border-gray-800 rounded-xl text-center mt-4">Customers Component</div>}
        
        {activeTab === 'forecast' && <div className="text-gray-500 p-12 border border-dashed border-gray-800 rounded-xl text-center mt-4">Forecast Component</div>}
        
        {activeTab === 'insights' && <div className="text-gray-500 p-12 border border-dashed border-gray-800 rounded-xl text-center mt-4">Insights Component</div>}
      </div>

    </div>
  );
}