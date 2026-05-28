// Defining our navigation links outside the component keeps the code clean
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'live-orders', label: 'Live orders', icon: '🧾' },
  { id: 'menu-editor', label: '🍳 Menu editor', icon: '🍳' }, // Using emojis as placeholders for your real icons
  { id: 'branding', label: 'Branding studio', icon: '🎨' },
  { id: 'offers', label: 'Offers & promos', icon: '🏷️' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'qr-code', label: 'My QR code', icon: '📱' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// We pass in two "props": the current tab, and the function to change it
interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className="w-64 bg-[#0F111A] border-r border-[#1F2330] h-screen flex flex-col shrink-0">
      
      {/* Top Branding Section (Pabee Logo) */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-[#E5B35C] font-serif text-2xl font-bold tracking-wide">pabee</h1>
          <span className="text-[9px] uppercase tracking-widest text-[#E5B35C] border border-[#E5B35C]/30 px-2 py-0.5 rounded-full">
            Tier 1 Street Food
          </span>
        </div>
        
        {/* Vendor Specific Info */}
        <div className="border-b border-[#1F2330] pb-6">
          <h2 className="text-gray-200 font-bold flex items-center gap-2 text-sm">
            <span>🍲</span> Spice Street Chaat
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">Kothrud, Pune • Tier 1</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-3 py-2 overflow-y-auto no-scrollbar">
        <p className="text-[10px] text-gray-600 font-bold tracking-widest mb-3 px-3 uppercase">Main</p>
        
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-[#1A1D24] text-[#E5B35C] font-medium shadow-sm' // Active state (Gold)
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1D24]/50' // Inactive state (Gray)
              }`}
            >
              <span className="text-lg opacity-80">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

    </div>
  );
}