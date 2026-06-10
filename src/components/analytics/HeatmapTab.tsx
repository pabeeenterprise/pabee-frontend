export interface HourlyData {
    time: string;
    intensity: number; // 0 to 1 (0 is dead, 1 is slammed)
  }
  
  export interface PeakHour {
    timeRange: string;
    percentage: number;
  }
  
  export interface HeatmapData {
    hourly: HourlyData[];
    peakHours: PeakHour[];
    slowTip: { title: string; subtitle: string };
  }
  
  export default function HeatmapTab({ data }: { data: HeatmapData }) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in pt-4">
        
        {/* HOURLY HEATMAP ROW */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md overflow-x-auto">
          <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-6">Hourly Order Heatmap</h3>
          
          <div className="flex gap-1 min-w-[600px]">
            {data.hourly.map((hour, i) => {
              // Dynamically calculate the background color based on intensity
              // Using a deep red/orange scale to match your screenshot
              const opacity = hour.intensity === 0 ? 0.05 : Math.max(0.2, hour.intensity);
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-crosshair">
                  <span className="text-[10px] text-gray-500 font-medium">{hour.time}</span>
                  <div 
                    className="w-full h-12 rounded-sm transition-all duration-300 relative border border-black/20"
                    style={{ backgroundColor: `rgba(220, 38, 38, ${opacity})` }} // Tailwind red-600 with dynamic opacity
                  >
                    {/* Hover Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-[#0B0E14] text-[#E5B35C] border border-[#1F2330] text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity font-bold">
                      {Math.round(hour.intensity * 100)}% Capacity
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PEAK HOURS SECTION (Takes up 2/3 width) */}
          <div className="lg:col-span-2 bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
            <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-6">Peak Hours</h3>
            <div className="flex flex-col gap-6">
              {data.peakHours.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-300 font-medium">{item.timeRange}</span>
                    <span className="text-sm font-bold text-[#E5B35C]">{item.percentage}%</span>
                  </div>
                  {/* Progress Bar Track */}
                  <div className="w-full bg-[#1A1D24] rounded-full h-1.5 overflow-hidden">
                    {/* Progress Bar Fill - Decreasing colors based on rank */}
                    <div 
                      className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-yellow-600'}`} 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* SLOW HOUR TIP SECTION (Takes up 1/3 width) */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md flex flex-col justify-center">
            <h3 className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-4">Slow Hour Tip</h3>
            <div className="flex gap-4 items-start">
              <span className="text-2xl mt-1">💡</span>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">{data.slowTip.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{data.slowTip.subtitle}</p>
              </div>
            </div>
          </div>
  
        </div>
      </div>
    );
  }