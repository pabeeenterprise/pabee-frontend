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

  // 👇 NEW: Security flag to lock customers out of Dev Tools
  const [isCustomerMode, setIsCustomerMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedVendor = params.get('vendor');
    const scannedTable = params.get('table');

    if (scannedVendor && scannedTable) {
      setVendorId(scannedVendor);
      setTableId(scannedTable);
      setCurrentView('menu'); 
      setIsCustomerMode(true); // Lock them into the customer experience!
    }
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
      <div className="min-h-screen bg-[#0a0a0a] pb-10">
        
        {/* DEV TOGGLE BAR (Only shows if NOT in Customer Mode) */}
        {!isCustomerMode && (
          <div className="bg-[#1A1A1A] border-b border-gray-800 text-white p-2 flex justify-center items-center gap-6 text-xs font-bold overflow-x-auto relative z-50">
            <span className="text-gray-500 hidden md:inline">DEV TOOLS:</span>
            
            <button 
              onClick={() => setCurrentView('scanner')} 
              className={`hover:text-blue-400 whitespace-nowrap ${['scanner', 'menu', 'checkout'].includes(currentView) ? 'text-blue-400' : ''}`}
            >
              📱 Customer App
            </button>
            
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className={`hover:text-green-400 whitespace-nowrap ${currentView === 'dashboard' ? 'text-green-400' : ''}`}
            >
              📈 Vendor Dashboard
            </button>
            
            {authToken && (
              <button onClick={handleLogout} className="absolute right-4 text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded transition-colors">
                Logout
              </button>
            )}
          </div>
        )}

        {/* View Routing */}
        {currentView === 'scanner' && !showLogin && <QRScanner onScanSuccess={handleScanSuccess} />}
        
        {currentView === 'menu' && !showLogin && <CustomerMenu vendorId={vendorId} onGoToCheckout={() => setCurrentView('checkout')} />}
        
        {currentView === 'checkout' && !showLogin && <Checkout vendorId={vendorId} tableId={tableId} onBack={() => setCurrentView('menu')} />}
        
        {showLogin && <VendorLogin vendorId={vendorId} onLoginSuccess={handleSuccessfulLogin} />}
        {currentView === 'dashboard' && authToken && <VendorDashboard vendorId={vendorId} />}
        
      </div>
    </CartProvider>
  );
}

export default App;