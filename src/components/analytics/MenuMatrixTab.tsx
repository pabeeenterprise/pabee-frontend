// src/components/analytics/MenuMatrixTab.tsx

export interface MenuMatrixItem {
    name: string;
    value: string;
  }
  
  export interface MenuMatrixData {
    stars: MenuMatrixItem[];
    plowhorses: MenuMatrixItem[];
    puzzles: MenuMatrixItem[];
    dogs: MenuMatrixItem[];
    margins: { name: string; margin: number }[];
  }
  
  export default function MenuMatrixTab({ data }: { data: MenuMatrixData }) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in pt-4">
        
        {/* HEADER EXPLANATION */}
        <div>
          <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-1">Menu Engineering Matrix</h3>
          <p className="text-xs text-gray-500">Classified by popularity × profit margin. Add cost prices in Edit Item to see full matrix.</p>
        </div>
  
        {/* 2x2 MATRIX GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* STARS */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-md">
            <h4 className="text-sm font-bold text-green-500 mb-1 flex items-center gap-2">⭐ Stars</h4>
            <p className="text-[10px] text-gray-500 mb-4">High sales · High margin</p>
            <div className="flex flex-col gap-3">
              {data.stars.length === 0 ? <p className="text-sm text-gray-600">None yet</p> : data.stars.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[#1F2330] pb-2 last:border-0 last:pb-0">
                  <span className="text-sm text-white font-medium">{item.name}</span>
                  <span className="text-sm font-bold text-green-500">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
  
          {/* PLOWHORSES */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-md">
            <h4 className="text-sm font-bold text-blue-400 mb-1 flex items-center gap-2">🐴 Plowhorses</h4>
            <p className="text-[10px] text-gray-500 mb-4">High sales · Low margin</p>
            <div className="flex flex-col gap-3">
              {data.plowhorses.length === 0 ? <p className="text-sm text-gray-600">None yet</p> : data.plowhorses.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[#1F2330] pb-2 last:border-0 last:pb-0">
                  <span className="text-sm text-white font-medium">{item.name}</span>
                  <span className="text-sm font-bold text-blue-400">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
  
          {/* PUZZLES */}
          <div className="bg-[#13161F] border border-[#E5B35C]/30 rounded-xl p-5 shadow-md">
            <h4 className="text-sm font-bold text-[#E5B35C] mb-1 flex items-center gap-2">❓ Puzzles</h4>
            <p className="text-[10px] text-gray-500 mb-4">Low sales · High margin</p>
            <div className="flex flex-col gap-3">
              {data.puzzles.length === 0 ? <p className="text-sm text-gray-600">None yet</p> : data.puzzles.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[#1F2330] pb-2 last:border-0 last:pb-0">
                  <span className="text-sm text-white font-medium">{item.name}</span>
                  <span className="text-sm font-bold text-[#E5B35C]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
  
          {/* DOGS */}
          <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-md">
            <h4 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-2">🐕 Dogs</h4>
            <p className="text-[10px] text-gray-500 mb-4">Low sales · Low margin</p>
            <div className="flex flex-col gap-3">
              {data.dogs.length === 0 ? <p className="text-sm text-gray-600">None yet</p> : data.dogs.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[#1F2330] pb-2 last:border-0 last:pb-0">
                  <span className="text-sm text-white font-medium">{item.name}</span>
                  <span className="text-sm font-bold text-red-400">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
  
        </div>
  
        {/* ITEM MARGINS BAR CHART */}
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6 shadow-md mt-2">
          <h3 className="text-[11px] text-[#E5B35C] font-bold uppercase tracking-widest mb-6">Item Margins</h3>
          
          <div className="flex flex-col gap-5">
            {data.margins.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-300 font-medium">{item.name}</span>
                  <span className="text-green-500 font-bold">{item.margin}% margin</span>
                </div>
                <div className="w-full bg-[#1A1D24] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${item.margin}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
  
      </div>
    );
  }