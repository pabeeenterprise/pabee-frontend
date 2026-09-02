import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

// 🚨 We add a 'locked' boolean to physically show the worker what is off-limits
const NAV_ITEMS = [
  // PUBLIC TABS
  { id: 'live-orders', label: 'Master Terminal', icon: '🧾', locked: false },
  { id: 'qr-code', label: 'Customer QR Code', icon: '📱', locked: false },
  
  // RESTRICTED TABS (Requires PIN)
  { id: 'overview', label: 'Overview', icon: '📊', locked: true },
  { id: 'menu-editor', label: 'Menu Editor', icon: '🍳', locked: true }, 
  { id: 'offers', label: 'Offers & Promos', icon: '🏷️', locked: true },
  { id: 'analytics', label: 'Analytics', icon: '📈', locked: true },
  { id: 'payment-settings', label: 'Payment Setup', icon: '💳', locked: true },
  { id: 'branding', label: 'Branding Studio', icon: '🎨', locked: true },
  { id: 'settings', label: 'Settings', icon: '⚙️', locked: true } 
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { userId, getToken } = useAuth();
  const [vendorData, setVendorData] = useState<{ name?: string; address?: string; tier?: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchVendor = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setVendorData(data);
        }
      } catch (err) {
        console.error("Sidebar: failed to fetch vendor profile", err);
      }
    };
    fetchVendor();
  }, [userId, getToken]);

  return (
    <div className="w-64 bg-[#0F111A] border-r border-[#1F2330] h-screen flex flex-col shrink-0">
      
      {/* Top Branding Section (Pabee Logo) */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-[#E5B35C] font-serif text-2xl font-bold tracking-wide">pabee</h1>
          <span className="text-[9px] uppercase tracking-widest text-[#E5B35C] border border-[#E5B35C]/30 px-2 py-0.5 rounded-full">
            Tier {vendorData?.tier || 1} Street Food
          </span>
        </div>
        
        {/* Vendor Specific Info */}
        <div className="border-b border-[#1F2330] pb-6">
          <h2 className="text-gray-200 font-bold flex items-center gap-2 text-sm">
            <span>🍲</span> {vendorData?.name || 'Unnamed Store'}
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">{vendorData?.address || 'No location set'} • Tier {vendorData?.tier || 1}</p>
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-[#1A1D24] text-[#E5B35C] font-medium shadow-sm border border-gray-800/50' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1D24]/50' 
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg opacity-80">{item.icon}</span>
                {item.label}
              </div>
              
              {/* 🚨 VISUAL PADLOCK FOR RESTRICTED TABS */}
              {item.locked && (
                <span className={`text-[10px] ${activeTab === item.id ? 'opacity-100' : 'opacity-40'}`}>
                  🔒
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

    </div>
  );
}