import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import RevenueTab, { AnalyticsData } from './analytics/RevenueTab';
import MenuMatrixTab from './analytics/MenuMatrixTab'; 
import HeatmapTab from './analytics/HeatmapTab';
import CustomersTab from './analytics/CustomersTab';
import ForecastTab from './analytics/ForecastTab'; // 👈 Imported
import InsightsTab from './analytics/InsightsTab'; // 👈 Imported

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
    stars: [{ name: 'Pav Bhaji', value: '65%' }, { name: 'Sev Puri', value: '63%' }],
    plowhorses: [],
    puzzles: [
      { name: 'Special Pav Bhaji', value: '64%' }, { name: 'Vada Pav', value: '68%' },
      { name: 'Cheese Vada Pav', value: '63%' }, { name: 'Bhel Puri', value: '64%' },
      { name: 'Dahi Puri', value: '64%' }, { name: 'Masala Chai', value: '80%' },
      { name: 'Cold Coffee', value: '67%' }, { name: 'Sugarcane Juice', value: '73%' }
    ],
    dogs: [],
    margins: [
      { name: 'Masala Chai', margin: 80 }, { name: 'Sugarcane Juice', margin: 73 },
      { name: 'Vada Pav', margin: 68 }, { name: 'Cold Coffee', margin: 67 },
      { name: 'Pav Bhaji', margin: 65 }, { name: 'Dahi Puri', margin: 64 },
      { name: 'Bhel Puri', margin: 64 }, { name: 'Special Pav Bhaji', margin: 64 },
      { name: 'Sev Puri', margin: 63 }, { name: 'Cheese Vada Pav', margin: 63 }
    ]
  },
  heatmap: {
    hourly: [
      { time: '9AM', intensity: 0.1 }, { time: '10', intensity: 0.15 }, { time: '11', intensity: 0.3 },
      { time: '12PM', intensity: 0.8 }, { time: '1', intensity: 0.85 }, { time: '2', intensity: 0.5 },
      { time: '3', intensity: 0.2 }, { time: '4', intensity: 0.3 }, { time: '5', intensity: 0.6 },
      { time: '6PM', intensity: 0.95 }, { time: '7', intensity: 1.0 }, { time: '8PM', intensity: 0.8 }
    ],
    peakHours: [
      { timeRange: '6–8 PM', percentage: 90 },
      { timeRange: '12–2 PM', percentage: 82 },
      { timeRange: '8–10 PM', percentage: 72 }
    ],
    slowTip: {
      title: '3–5 PM is your slowest',
      subtitle: 'A "Teatime special" during 3–5 PM can boost revenue by ~₹400/day.'
    }
  },
  customers: {
    confirmedOrders: 2,
    repeatRate: 38,
    ltv: 518,
    orderSizeBreakdown: [
      { range: '₹0–50', count: 0 }, { range: '₹51–100', count: 0 },
      { range: '₹101–150', count: 1 }, { range: '₹150+', count: 1 }
    ]
  },
  // 👈 3. Forecast block populated
  forecast: {
    weeklyProjected: 25500,
    days: [
      { day: 'Mon', amount: 2800, isPeak: false },
      { day: 'Tue', amount: 3100, isPeak: false },
      { day: 'Wed', amount: 2600, isPeak: false },
      { day: 'Thu', amount: 3400, isPeak: false },
      { day: 'Fri', amount: 4800, isPeak: true },
      { day: 'Sat', amount: 5600, isPeak: true },
      { day: 'Sun', amount: 3200, isPeak: false }
    ]
  },
  // 👈 4. Insights array populated to mimic screenshots
  insights: {
    items: [
      { type: 'update', title: 'Revenue update', description: '₹324 earned today. Need ₹4,676 more to hit your ₹5,000 target.' },
      { type: 'star', title: '"Pav Bhaji" is your #1 seller', description: 'Consider creating a premium "Special Pav Bhaji" variant at 20% higher price.' },
      { type: 'clock', title: 'Prep before peak hours', description: '6–8 PM drives 38% of daily orders. Pre-prep before 5:30 PM to reduce wait times and avoid lost sales.' },
      { type: 'alert', title: '"Cheese Vada Pav" has low margin (63%)', description: 'Consider raising price by ₹4 or reducing ingredient cost.', badgeText: 'Margin Check' },
      { type: 'payment', title: 'Push UPI payments', description: 'UPI customers order 12% more on average. Offer a small incentive (free chutney extra) for UPI payers.' }
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
          setData(prev => ({
            ...prev,
            ...realData,
            menuMatrix: realData.menuMatrix || prev.menuMatrix,
            heatmap: realData.heatmap || prev.heatmap,
            customers: realData.customers || prev.customers,
            forecast: realData.forecast || prev.forecast,
            insights: realData.insights || prev.insights
          })); 
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

      {/* TOP CARDS */}
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

      {/* NAVIGATION TABS */}
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
              activeTab === tab.id ? 'border-[#E5B35C] text-[#E5B35C]' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="opacity-80">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* COMPLETE ROUTED VIEW TERMINALS */}
      <div className="min-h-[400px]">
        {activeTab === 'revenue' && <RevenueTab data={data} />}
        
        {activeTab === 'menu-matrix' && (
          data.menuMatrix ? <MenuMatrixTab data={data.menuMatrix} /> : <div className="text-gray-500 p-12 text-center animate-pulse">Loading Matrix...</div>
        )}

        {activeTab === 'customers' && (
          data.customers ? <CustomersTab data={data.customers} /> : <div className="text-gray-500 p-12 text-center animate-pulse">Loading Customers...</div>
        )}
        
        {activeTab === 'heatmap' && (
          data.heatmap ? <HeatmapTab data={data.heatmap} /> : <div className="text-gray-500 p-12 text-center animate-pulse">Loading Heatmap...</div>
        )}
        
        {/* 👈 5. Forecast sub-routing complete */}
        {activeTab === 'forecast' && (
          data.forecast ? <ForecastTab data={data.forecast} /> : <div className="text-gray-500 p-12 text-center animate-pulse">Running Calculations...</div>
        )}

        {/* 👈 6. Insights sub-routing complete */}
        {activeTab === 'insights' && (
          data.insights ? <InsightsTab data={data.insights} /> : <div className="text-gray-500 p-12 text-center animate-pulse">Running Recommendations...</div>
        )}
      </div>

    </div>
  );
}