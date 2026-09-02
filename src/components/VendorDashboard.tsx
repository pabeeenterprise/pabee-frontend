import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; 
import Sidebar from './Sidebar';
import LiveOrders from './LiveOrders';
import Overview from './Overview';
import MenuEditor from './MenuEditor';
import Analytics from './Analytics';
import OffersPromos from './OffersPromos';
import MyQRCode from './MyQRCode';
import Settings from './Settings';
import BrandingStudio from './BrandingStudio';
import PaymentSettings from './PaymentSettings';
import PinLock from './PinLock'; 

export default function VendorDashboard({ vendorId: defaultVendorId }: { vendorId: string }) {
  const { userId, isLoaded } = useAuth(); 
  const [activeTab, setActiveTab] = useState('live-orders');
  const [realVendorId, setRealVendorId] = useState<string | null>(null);

  // 🚨 SECURITY STATES
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [attemptingToAccess, setAttemptingToAccess] = useState<string | null>(null);

  // Link Clerk Auth to your Prisma Database
  useEffect(() => {
    if (userId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${userId}/profile`)
        .then(res => {
          if (!res.ok) throw new Error("Profile not found");
          return res.json();
        })
        .then(data => {
          setRealVendorId(data.id); 
        })
        .catch(err => {
          console.error("Database sync error:", err);
          setRealVendorId(defaultVendorId); 
        });
    }
  }, [userId, defaultVendorId]);

  // 🚨 THE NAVIGATION INTERCEPTOR
  const handleTabRequest = (requestedTab: string) => {
    // Define exactly which tabs the worker is FORBIDDEN to see without a PIN
    const restrictedTabs = [
      'overview', 
      'menu-editor', 
      'analytics', 
      'settings', 
      'branding', 
      'payment-settings', 
      'offers'
    ];

    if (restrictedTabs.includes(requestedTab) && !isUnlocked) {
      // Freeze navigation and pop the lock screen
      setAttemptingToAccess(requestedTab);
    } else {
      // Allow them through (e.g., Live Orders, QR Code, or if already unlocked)
      setActiveTab(requestedTab);
    }
  };

  if (!isLoaded || !realVendorId || !userId) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-[#E5B35C] font-serif text-xl">
        Loading secure dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-200 font-sans flex overflow-hidden">
      
      {/* 🚨 THE LOCK SCREEN OVERLAY */}
      {attemptingToAccess && (
        <PinLock 
          vendorId={realVendorId}
          onUnlocked={() => {
            setIsUnlocked(true); // Unlock for the rest of the session
            setActiveTab(attemptingToAccess); // Send them to the tab they wanted
            setAttemptingToAccess(null); // Close the modal
          }}
          onCancel={() => setAttemptingToAccess(null)} // Close modal without changing tabs
        />
      )}

      {/* 🚨 WE HIJACK THE SIDEBAR HERE */}
      <Sidebar activeTab={activeTab} setActiveTab={handleTabRequest} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <main className="flex-1 overflow-y-auto w-full">

          {activeTab === 'live-orders' && (
            <div className="flex flex-col h-full overflow-y-auto w-full">
              {/* The Live Queue + POS Master Terminal */}
              <LiveOrders vendorId={realVendorId} />
            </div>
          )}
          
          {activeTab === 'overview' && <Overview vendorId={realVendorId} />}
          {activeTab === 'menu-editor' && <MenuEditor vendorId={realVendorId} />}
          {activeTab === 'offers' && <OffersPromos vendorId={realVendorId} />}
          {activeTab === 'analytics' && <Analytics vendorId={realVendorId} />}
          {activeTab === 'qr-code' && <MyQRCode vendorId={userId} />}
          {activeTab === 'settings' && <Settings vendorId={userId} />}
          {activeTab === 'branding' && <BrandingStudio vendorId={userId} />}
          {activeTab === 'payment-settings' && <PaymentSettings vendorId={realVendorId} />}
        </main>
      </div>
    </div>
  );
}