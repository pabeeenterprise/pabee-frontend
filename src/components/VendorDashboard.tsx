import { useState } from 'react';
import Sidebar from './Sidebar';
import LiveOrders from './LiveOrders';
import Overview from './Overview';
import MenuEditor from './MenuEditor';
import Analytics from './Analytics';
import OffersPromos from './OffersPromos';
import MyQRCode from './MyQRCode';

export default function VendorDashboard({ vendorId }: { vendorId: string }) {
  // The master state that remembers which tab we are looking at
  const [activeTab, setActiveTab] = useState('live-orders');

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-200 font-sans flex overflow-hidden">
      
      {/* 1. We just drop the Sidebar component here! */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Dynamic Tab Content (This swaps out based on what you click) */}
        <main className="flex-1 overflow-y-auto w-full">
          {activeTab === 'live-orders' && <LiveOrders vendorId={vendorId} />}
          {activeTab === 'overview' && <Overview vendorId={vendorId} />}
          {activeTab === 'menu-editor' && <MenuEditor vendorId={vendorId} />}
          {activeTab === 'offers' && <OffersPromos />}
          {activeTab === 'analytics' && <Analytics vendorId={vendorId} />}
          {activeTab === 'qr-code' && <MyQRCode vendorId={vendorId} />}
          {activeTab === 'settings' && <div className="p-8 text-gray-500">Settings coming next...</div>}
        </main>

      </div>
    </div>
  );
}