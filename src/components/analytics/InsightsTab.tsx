// src/components/analytics/InsightsTab.tsx

export interface ActionInsight {
    type: 'update' | 'star' | 'clock' | 'alert' | 'payment';
    title: string;
    description: string;
    badgeText?: string;
  }
  
  export interface InsightsData {
    items: ActionInsight[];
  }
  
  export default function InsightsTab({ data }: { data: InsightsData }) {
    // Map internal types to specific background styles and icons
    const getCardStyle = (type: string) => {
      switch (type) {
        case 'update': return { bg: 'bg-[#13161F]', border: 'border-l-4 border-l-blue-500', icon: '📈' };
        case 'star': return { bg: 'bg-[#13161F]', border: 'border-l-4 border-l-yellow-500', icon: '⭐' };
        case 'clock': return { bg: 'bg-[#13161F]', border: 'border-l-4 border-l-purple-500', icon: '⏱️' };
        case 'alert': return { bg: 'bg-red-950/10', border: 'border border-red-900/30 border-l-4 border-l-red-500', icon: '⚠️' };
        case 'payment': return { bg: 'bg-[#13161F]', border: 'border-l-4 border-l-green-500', icon: '📱' };
        default: return { bg: 'bg-[#13161F]', border: 'border-l-4 border-l-gray-700', icon: '💡' };
      }
    };
  
    return (
      <div className="flex flex-col gap-4 animate-fade-in pt-4">
        <h3 className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-2">Live recommendations from your data</h3>
        
        <div className="flex flex-col gap-3">
          {data.items.map((insight, i) => {
            const style = getCardStyle(insight.type);
            return (
              <div 
                key={i} 
                className={`${style.bg} ${style.border} border border-y border-r border-[#1F2330] rounded-r-xl p-5 shadow-sm flex items-start gap-4 transition-transform duration-200 hover:translate-x-1`}
              >
                <span className="text-xl mt-0.5">{style.icon}</span>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                    {insight.title}
                    {insight.badgeText && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono tracking-wider">
                        {insight.badgeText}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  