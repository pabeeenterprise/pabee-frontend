import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './components/CustomerMenu';
import Checkout from './components/Checkout';
import VendorDashboard from './components/VendorDashboard';
import VendorLogin from './components/VendorLogin';
import QRScanner from './components/QRScanner'; 

function App() {
  // 👇 Removed 'admin' from the allowed views
  const [currentView, setCurrentView] = useState<'scanner' | 'menu' | 'checkout' | 'dashboard'>('scanner');

  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const [vendorId, setVendorId] = useState("spice-street-kitchen");
  const [tableId, setTableId] = useState("Table-Unknown");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedVendor = params.get('vendor');
    const scannedTable = params.get('table');

    if (scannedVendor && scannedTable) {
      setVendorId(scannedVendor);
      setTableId(scannedTable);
      setCurrentView('menu'); 
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
      <div className="min-h-screen bg-bg pb-10">
        
        {/* DEV TOGGLE BAR */}
        <div className="bg-text text-white p-2 flex justify-center items-center gap-6 text-xs font-bold overflow-x-auto relative z-50">
          <span className="text-muted hidden md:inline">DEV TOOLS:</span>
          
          <button 
            onClick={() => setCurrentView('scanner')} 
            className={`hover:text-blue whitespace-nowrap ${['scanner', 'menu', 'checkout'].includes(currentView) ? 'text-blue' : ''}`}
          >
            📱 Customer App
          </button>
          
          <button 
            onClick={() => setCurrentView('dashboard')} 
            className={`hover:text-green whitespace-nowrap ${currentView === 'dashboard' ? 'text-green' : ''}`}
          >
            📈 Vendor Dashboard
          </button>
          
          {/* 👇 Super Admin button was deleted from here */}
          
          {authToken && (
            <button onClick={handleLogout} className="absolute right-4 text-red bg-white/10 px-2 py-1 rounded">Logout</button>
          )}
        </div>

        {/* View Routing */}
        {currentView === 'scanner' && !showLogin && <QRScanner onScanSuccess={handleScanSuccess} />}
        
        {currentView === 'menu' && !showLogin && <CustomerMenu vendorId={vendorId} onGoToCheckout={() => setCurrentView('checkout')} />}
        
        {currentView === 'checkout' && !showLogin && <Checkout vendorId={vendorId} tableId={tableId} onBack={() => setCurrentView('menu')} />}
        
        {showLogin && <VendorLogin vendorId={vendorId} onLoginSuccess={handleSuccessfulLogin} />}
        {currentView === 'dashboard' && authToken && <VendorDashboard vendorId={vendorId} />}
        
        {/* 👇 Super Admin route was deleted from here */}

      </div>
    </CartProvider>
  );
}

export default App;