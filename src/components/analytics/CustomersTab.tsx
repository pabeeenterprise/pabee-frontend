export interface OrderSizeBucket {
    range: string;
    count: number;
  }
  
  export interface CustomersData {
    confirmedOrders: number;
    repeatRate: number;
    ltv: number;
    orderSizeBreakdown: OrderSizeBucket[];
  }
  
  export default function CustomersTab({ data }: { data: CustomersData }) {
    // Find the max order count so our red progress bars scale perfectly
    const maxCount = Math.max(...data.orderSizeBreakdown.map(b => b.count), 1);
  
    return (
      <div className="flex flex-col gap-6 animate-fade-in pt-4">
        
        {/* TOP 3 METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Confirmed Orders */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
            <h2 className="text-3xl font-serif text-[#E5B35C] mb-2">{data.confirmedOrders}</h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Confirmed Orders</p>
          </div>
  
          {/* Repeat Rate */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
            <h2 className="text-3xl font-serif text-green-500 mb-2">~{data.repeatRate}%</h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Est. Repeat Rate</p>
          </div>
  
          {/* 30-Day LTV */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md">
            <h2 className="text-3xl font-serif text-blue-500 mb-2">₹{data.ltv}</h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Est. 30-Day LTV</p>
          </div>
  
        </div>
  
        {/* ORDER SIZE BREAKDOWN */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md mt-2">
          <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-6">Order Size Breakdown (Real)</h3>
          
          <div className="flex flex-col gap-6">
            {data.orderSizeBreakdown.map((bucket, i) => {
              const widthPercent = (bucket.count / maxCount) * 100;
              
              return (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-300">{bucket.range}</span>
                    <span className={`text-sm font-bold ${bucket.count > 0 ? 'text-[#E5B35C]' : 'text-gray-500'}`}>
                      {bucket.count} {bucket.count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                  {/* Progress Bar Track */}
                  <div className="w-full bg-[#1A1D24] rounded-sm h-3 overflow-hidden">
                    {/* Red Progress Fill */}
                    <div 
                      className="h-full bg-red-600 transition-all duration-500" 
                      style={{ width: `${widthPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
  
      </div>
    );
  }