import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './components/CustomerMenu';
import Checkout from './components/Checkout';
import VendorDashboard from './components/VendorDashboard';
import QRScanner from './components/QRScanner'; 

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'menu' | 'checkout' | 'dashboard'>('scanner');
  const [vendorId, setVendorId] = useState("spice-street-kitchen");
  const [tableId, setTableId] = useState("Table-Unknown");

  // 🛡️ SECURITY FLAG
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedVendor = params.get('vendor');
    const scannedTable = params.get('table');
    
    // 👇 THE SECRET DOOR: Checks if the URL has ?admin=true
    const secretAdminKey = params.get('admin');

    if (secretAdminKey === 'true') {
      setIsAdminMode(true);
      setCurrentView('dashboard');
    } else if (scannedVendor && scannedTable) {
      setVendorId(scannedVendor);
      setTableId(scannedTable);
      setCurrentView('menu'); 
    }
  }, []);

  const handleScanSuccess = (scannedVendor: string, scannedTable: string) => {
    setVendorId(scannedVendor);
    setTableId(scannedTable);
    setCurrentView('menu');
  };

  return (
    <CartProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="min-h-screen bg-[#0a0a0a] pb-10 relative">

        {/* --- CUSTOMER ROUTES (Hidden completely from Admins) --- */}
        {!isAdminMode && currentView === 'scanner' && <QRScanner onScanSuccess={handleScanSuccess} />}
        
        {!isAdminMode && currentView === 'menu' && <CustomerMenu vendorId={vendorId} onGoToCheckout={() => setCurrentView('checkout')} />}
        
        {!isAdminMode && currentView === 'checkout' && <Checkout vendorId={vendorId} tableId={tableId} onBack={() => setCurrentView('menu')} />}
        
        {/* --- VENDOR ROUTES (Protected by the Secret Door & Clerk) --- */}
        {isAdminMode && (
          <div className="h-full">
            
            {/* If Vendor is NOT logged in, show the secure Clerk login box */}
            <SignedOut>
              <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
                <SignIn 
                  routing="virtual" 
                  fallbackRedirectUrl="/?admin=true" 
                  signUpFallbackRedirectUrl="/?admin=true" 
                />
              </div>
            </SignedOut>

            {/* If Vendor IS logged in, show the Dashboard */}
            <SignedIn>
              <div className="bg-[#121212] p-3 flex justify-between items-center px-6 border-b border-gray-800">
                <span className="text-[#E5B35C] font-serif font-bold text-lg">pabee Admin</span>
                <UserButton />
              </div>
              <VendorDashboard vendorId={vendorId} />
            </SignedIn>

          </div>
        )}

      </div>
    </CartProvider>
  );
}

export default App;