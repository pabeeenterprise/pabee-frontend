import { useState, useEffect } from 'react';
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/react';
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
    // 1. Clear the tokens
    setAuthToken(null);
    localStorage.removeItem(`pabee_token_${vendorId}`);
    
    // 2. Reset the security flags
    setIsAdminMode(false);
    setCurrentView('scanner');

    // 3. Scrub the "?admin=true" right out of the browser URL silently!
    window.history.replaceState({}, '', window.location.pathname);
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
        <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Pabee</p>
              <p className="text-xs text-gray-400">Street food ordering</p>
            </div>
            <div className="flex min-h-9 items-center gap-2">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-emerald-400">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </div>
        </div>
        
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
