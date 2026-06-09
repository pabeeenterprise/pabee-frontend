import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; // 👈 NEW IMPORT
import Sidebar from './Sidebar';
import LiveOrders from './LiveOrders';
import Overview from './Overview';
import MenuEditor from './MenuEditor';
import Analytics from './Analytics';
import OffersPromos from './OffersPromos';
import MyQRCode from './MyQRCode';
import Settings from './Settings';
import BrandingStudio from './BrandingStudio';
import PaymentSettings from './PaymentSettings'; // 👈 1. ADD THIS IMPORT

export default function VendorDashboard({ vendorId: defaultVendorId }: { vendorId: string }) {
  const { userId, isLoaded } = useAuth(); // Grab the real Google ID!
  const [activeTab, setActiveTab] = useState('live-orders');
  const [realVendorId, setRealVendorId] = useState<string | null>(null);

  // Link Clerk Auth to your Prisma Database
  useEffect(() => {
    if (userId) {
      // Ask the backend: "What is the Prisma database ID for this Google user?"
      fetch(`https://pabee-backend.onrender.com/api/vendors/${userId}/profile`)
        .then(res => {
          if (!res.ok) throw new Error("Profile not found");
          return res.json();
        })
        .then(data => {
          setRealVendorId(data.id); // Success! Use your unique database ID
        })
        .catch(err => {
          console.error("Database sync error:", err);
          setRealVendorId(defaultVendorId); // Fallback to dummy data
        });
    }
  }, [userId, defaultVendorId]);

  if (!isLoaded || !realVendorId || !userId) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-[#E5B35C] font-serif text-xl">
        Loading secure dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-200 font-sans flex overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <main className="flex-1 overflow-y-auto w-full">
          {/* Your tools use the Prisma Database ID */}
          {activeTab === 'live-orders' && <LiveOrders vendorId={realVendorId} />}
          {activeTab === 'overview' && <Overview vendorId={realVendorId} />}
          {activeTab === 'menu-editor' && <MenuEditor vendorId={realVendorId} />}
          {activeTab === 'offers' && <OffersPromos vendorId={realVendorId} />}
          {activeTab === 'analytics' && <Analytics vendorId={realVendorId} />}
          {activeTab === 'qr-code' && <MyQRCode vendorId={userId} />}
          
          {/* Settings uses the Google Clerk ID to manage your profile! */}
          {activeTab === 'settings' && <Settings vendorId={userId} />}

          {/* Branding Studio */}
          {activeTab === 'branding' && <BrandingStudio vendorId={userId} />}

          {/* 💳 2. ADD THE PAYMENT SETTINGS HERE */}
          {activeTab === 'payment-settings' && <PaymentSettings vendorId={realVendorId} />}
        </main>
      </div>
    </div>
  );
}