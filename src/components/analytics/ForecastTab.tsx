// src/components/analytics/ForecastTab.tsx

export interface DailyForecast {
    day: string;
    amount: number;
    isPeak: boolean;
  }
  
  export interface ForecastData {
    weeklyProjected: number;
    days: DailyForecast[];
  }
  
  export default function ForecastTab({ data }: { data: ForecastData }) {
    const maxAmount = Math.max(...data.days.map(d => d.amount), 1);
  
    return (
      <div className="flex flex-col gap-6 animate-fade-in pt-4">
        
        {/* CARD CONTEXT */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-1">
                Revenue Forecast — Next 7 Days (Illustrative)
              </h3>
              <p className="text-xs text-gray-500">
                Estimates based on typical street food day-of-week patterns. Your mileage may vary.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Projected Weekly</span>
              <span className="text-xl font-serif text-[#E5B35C] font-bold">₹{data.weeklyProjected.toLocaleString()}</span>
            </div>
          </div>
  
          {/* HORIZONTAL FORECAST BARS */}
          <div className="flex flex-col gap-4">
            {data.days.map((item, i) => {
              const widthPercent = (item.amount / maxAmount) * 100;
              
              return (
                <div key={i} className="flex items-center gap-4 group">
                  {/* Day Label */}
                  <span className="text-xs text-gray-400 w-10 font-medium">{item.day}</span>
                  
                  {/* Track Bar */}
                  <div className="flex-1 bg-[#1A1D24] h-8 rounded-md overflow-hidden relative border border-transparent hover:border-gray-800 transition-colors">
                    {/* Progress Fill (Uses orange/red for peak weekend days, brown for weekdays) */}
                    <div 
                      className={`h-full transition-all duration-700 flex items-center pl-3 ${
                        item.isPeak 
                          ? 'bg-gradient-to-r from-orange-600/50 to-red-600/40 text-orange-400 font-bold' 
                          : 'bg-gradient-to-r from-[#3D2C1D] to-[#1F2330] text-gray-400'
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    >
                      {/* Inline value appears if bar has enough space */}
                      {widthPercent > 20 && (
                        <span className="text-xs font-mono">₹{item.amount.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
  
                  {/* Right Side Fallback Label for small bars */}
                  <span className="text-xs font-mono text-gray-500 w-16 text-right group-hover:text-white transition-colors">
                    ₹{item.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
  
      </div>
    );
  }