import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './components/CustomerMenu';
import Checkout from './components/Checkout';
import VendorDashboard from './components/VendorDashboard';
import VendorLogin from './components/VendorLogin';
import QRScanner from './components/QRScanner'; 

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'menu' | 'checkout' | 'dashboard'>('scanner');
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const [vendorId, setVendorId] = useState("spice-street-kitchen");
  const [tableId, setTableId] = useState("Table-Unknown");

  // 🛡️ SECURITY FLAGS
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedVendor = params.get('vendor');
    const scannedTable = params.get('table');
    
    // 👇 THE SECRET DOOR: Checks if the URL has ?admin=true
    const secretAdminKey = params.get('admin');

    if (secretAdminKey === 'true') {
      // 1. The Vendor opened their secret bookmark
      setIsAdminMode(true);
      setCurrentView('dashboard');
    } else if (scannedVendor && scannedTable) {
      // 2. A Customer scanned a real table sticker
      setVendorId(scannedVendor);
      setTableId(scannedTable);
      setCurrentView('menu'); 
    }
    // 3. If neither is true, they stay on the locked-down 'scanner' view.
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(`pabee_token_${vendorId}`);
    if (savedToken) setAuthToken(savedToken);
  }, [vendorId]);

  const handleSuccessfulLogin = (token: string) => {
    setAuthToken(token);
    localStorage.setItem(`pabee_token_${vendorId}`, token);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem(`pabee_token_${vendorId}`);
    // Boot them back to the scanner when they log out
    setCurrentView('scanner');
  };

  const handleScanSuccess = (scannedVendor: string, scannedTable: string) => {
    setVendorId(scannedVendor);
    setTableId(scannedTable);
    setCurrentView('menu');
  };

  const requiresAuth = currentView === 'dashboard';
  const showLogin = requiresAuth && !authToken;

  return (
    <CartProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="min-h-screen bg-[#0a0a0a] pb-10 relative">
        
        {/* 🔥 DEV TOOLS ARE COMPLETELY DELETED 🔥 
          No one can click a button to see the dashboard anymore.
        */}

        {/* --- CUSTOMER ROUTES --- */}
        {currentView === 'scanner' && !showLogin && <QRScanner onScanSuccess={handleScanSuccess} />}
        
        {currentView === 'menu' && !showLogin && <CustomerMenu vendorId={vendorId} onGoToCheckout={() => setCurrentView('checkout')} />}
        
        {currentView === 'checkout' && !showLogin && <Checkout vendorId={vendorId} tableId={tableId} onBack={() => setCurrentView('menu')} />}
        
        {/* --- VENDOR ROUTES (Protected by the Secret Door) --- */}
        {showLogin && isAdminMode && <VendorLogin vendorId={vendorId} onLoginSuccess={handleSuccessfulLogin} />}
        
        {currentView === 'dashboard' && authToken && isAdminMode && (
          <div className="h-full">
             {/* A discrete logout button just for the vendor */}
             <div className="bg-[#121212] p-2 flex justify-end px-6 border-b border-gray-800">
               <button onClick={handleLogout} className="text-red-400 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                 Logout Vendor
               </button>
             </div>
             <VendorDashboard vendorId={vendorId} />
          </div>
        )}

      </div>
    </CartProvider>
  );
}

export default App;