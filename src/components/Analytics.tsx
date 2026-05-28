export default function Analytics({ vendorId: _vendorId }: { vendorId: string }) {
    // Mock data structurally matching the target screenshot
    const topItems = [
      { rank: 1, name: 'Pav Bhaji', rev: 12400, sold: 155 },
      { rank: 2, name: 'Sev Puri', rev: 8640, sold: 144 },
      { rank: 3, name: 'Vada Pav', rev: 6000, sold: 240 },
      { rank: 4, name: 'Bhel Puri', rev: 4800, sold: 96 },
      { rank: 5, name: 'Masala Chai', rev: 2400, sold: 120 },
    ];
  
    return (
      <div className="flex flex-col gap-6 max-w-7xl">
        
        {/* Header Row */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Analytics</h1>
            <p className="text-xs text-gray-500">Sales • Items • Payment • Peak hours</p>
          </div>
          <button className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm hover:text-white hover:border-gray-400 transition-colors">
            Export
          </button>
        </div>
  
        {/* Top KPI Cards (Month View) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
            <div className="text-[#E5B35C] text-3xl font-serif mb-1">₹62,400</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">This Month</div>
            <div className="text-xs text-green-400">↑ 22%</div>
          </div>
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
            <div className="text-[#E5B35C] text-3xl font-serif mb-1">482</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">Orders (Month)</div>
          </div>
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
            <div className="text-[#E5B35C] text-3xl font-serif mb-1">₹129</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">Avg Order</div>
          </div>
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
            <div className="text-[#E5B35C] text-3xl font-serif mb-1">4.6</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">Customer Rating</div>
          </div>
        </div>
  
        {/* Split Demographics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Payment Split */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 flex flex-col justify-center">
            <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Payment Split</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>UPI / QR</span><span className="text-[#3b82f6]">68%</span></div>
                <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#3b82f6] h-full rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Cash</span><span className="text-[#E5B35C]">28%</span></div>
                <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#E5B35C] h-full rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Card</span><span className="text-gray-500">4%</span></div>
                <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gray-600 h-full rounded-full" style={{ width: '4%' }}></div>
                </div>
              </div>
            </div>
          </div>
  
          {/* Peak Hours */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
            <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Peak Hours (This Week)</h3>
            <div className="space-y-4">
              {[
                { time: '12–2 PM', pct: 88 },
                { time: '6–8 PM', pct: 95 },
                { time: '8–10 PM', pct: 72 },
                { time: '9–11 AM', pct: 48 },
              ].map(slot => (
                <div key={slot.time} className="flex items-center gap-4">
                  <div className="w-16 text-xs text-gray-400">{slot.time}</div>
                  <div className="flex-1 bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#E5B35C] h-full rounded-full" style={{ width: `${slot.pct}%` }}></div>
                  </div>
                  <div className="w-8 text-right text-xs text-[#E5B35C]">{slot.pct}%</div>
                </div>
              ))}
            </div>
          </div>
  
        </div>
  
        {/* Bottom Grid Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Items List */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
            <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Top Items By Revenue</h3>
            <div className="flex flex-col gap-4">
              {topItems.map((item) => (
                <div key={item.name} className="flex justify-between items-center border-b border-[#1F2330] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A1D24] text-[#E5B35C] text-xs flex items-center justify-center font-bold">{item.rank}</span>
                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white font-bold">₹{item.rev.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500">{item.sold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* 30 Day Trend Chart */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
            <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">30-Day Revenue Trend</h3>
            <div className="h-48 flex items-end justify-between gap-1 border-b border-[#1F2330] pb-2">
               {/* Mocking a dense bar chart for the month */}
               {[40,42,45,30,50,55,60, 48,50,45,35,60,65,70, 55,50,48,40,65,70,75, 60,62,58,45,75,80,85, 70,68].map((height, i) => (
                  <div key={i} className="flex-1 bg-[#1C3A27] hover:bg-[#4ADE80] transition-colors rounded-t-sm" style={{ height: `${height}%` }}></div>
               ))}
            </div>
          </div>
  
        </div>
  
      </div>
    );
  }