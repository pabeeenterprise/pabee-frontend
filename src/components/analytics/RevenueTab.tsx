import { MenuMatrixData } from './MenuMatrixTab'; // 👈 1. Import the matrix type here
import { HeatmapData } from './HeatmapTab'; // 👈 ADD THIS LINE


export interface AnalyticsData {
    revenue: string;
    orders: number;
    avgOrder: number;
    rating: number;
    paymentSplit: { label: string; percentage: number; color: string }[];
    topItems: { id: number; name: string; sold: number }[];
    menuMatrix: MenuMatrixData; // 👈 2. Add the matrix requirement here
    heatmap: HeatmapData; // 👈 ADD THIS LINE
    // Keeping these optional so the interface doesn't break if you add them back later
    peakHours?: { label: string; percentage: number }[];
    trend?: number[];
  }
  
  export default function RevenueTab({ data }: { data: AnalyticsData }) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in pt-4">
        
        {/* 2-COLUMN GRID FOR DESKTOP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD 1: Payment Split */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
            <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-6">Payment Split (Real Orders)</h3>
            
            <div className="flex flex-col gap-6">
              {data.paymentSplit.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-300">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color.includes('blue') ? 'text-blue-500' : 'text-[#E5B35C]'}`}>
                      {item.percentage}%
                    </span>
                  </div>
                  {/* Progress Bar Track */}
                  <div className="w-full bg-[#1A1D24] rounded-full h-2 overflow-hidden">
                    {/* Progress Bar Fill */}
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* CARD 2: Top Items */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
            <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-2">Top Items (Real Data)</h3>
            
            <div className="flex flex-col">
              {data.topItems.map((item, i) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between py-3.5 ${i !== data.topItems.length - 1 ? 'border-b border-[#1F2330]' : ''}`}
                >
                  <span className="text-white text-sm font-medium">
                    {i + 1}. {item.name}
                  </span>
                  <span className="text-[#E5B35C] font-bold text-sm">
                    {item.sold} sold
                  </span>
                </div>
              ))}
            </div>
          </div>
  
        </div>
      </div>
    );
  }