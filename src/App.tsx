import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './components/CustomerMenu';
import Checkout from './components/Checkout';
import VendorDashboard from './components/VendorDashboard';
import VendorLogin from './components/VendorLogin';
import SuperAdmin from './components/SuperAdmin';

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'menu' | 'checkout' | 'dashboard' | 'admin'>('scanner');

  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const VENDOR_ID = "spice-street-kitchen";

  useEffect(() => {
    const savedToken = localStorage.getItem(`pabee_token_${VENDOR_ID}`);
    if (savedToken) setAuthToken(savedToken);
  }, []);

  const handleSuccessfulLogin = (token: string) => {
    setAuthToken(token);
    localStorage.setItem(`pabee_token_${VENDOR_ID}`, token);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem(`pabee_token_${VENDOR_ID}`);
    setCurrentView('menu');
  };

  // --- SECURITY GATEWAY ---
  const requiresAuth = currentView === 'dashboard';
  const showLogin = requiresAuth && !authToken;

  return (
    <CartProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="min-h-screen bg-bg pb-10">
        
        {/* DEV TOGGLE BAR */}
        <div className="bg-text text-white p-2 flex justify-center items-center gap-6 text-xs font-bold overflow-x-auto relative">
          <span className="text-muted hidden md:inline">DEV TOOLS:</span>
          <button onClick={() => setCurrentView('menu')} className={`hover:text-blue whitespace-nowrap ${currentView === 'menu' || currentView === 'checkout' ? 'text-blue' : ''}`}>📱 Customer App</button>
          <button onClick={() => setCurrentView('dashboard')} className={`hover:text-green whitespace-nowrap ${currentView === 'dashboard' ? 'text-green' : ''}`}>📈 Vendor Dashboard</button>
          <button 
  onClick={() => setCurrentView('admin')} 
  className={`hover:text-indigo-400 whitespace-nowrap ${currentView === 'admin' ? 'text-indigo-500' : ''}`}
>
  👑 Super Admin
</button>
          
          {authToken && (
            <button onClick={handleLogout} className="absolute right-4 text-red bg-white/10 px-2 py-1 rounded">Logout</button>
          )}
        </div>

        {/* View Routing */}
        {currentView === 'menu' && !showLogin && <CustomerMenu vendorId={VENDOR_ID} onGoToCheckout={() => setCurrentView('checkout')} />}
        {currentView === 'checkout' && !showLogin && <Checkout vendorId={VENDOR_ID} onBack={() => setCurrentView('menu')} />}
        
        {/* Protected Routes */}
        {showLogin && <VendorLogin vendorId={VENDOR_ID} onLoginSuccess={handleSuccessfulLogin} />}
        {currentView === 'dashboard' && authToken && <VendorDashboard vendorId={VENDOR_ID} />}
        {currentView === 'admin' && <SuperAdmin />}

      </div>
    </CartProvider>
  );
}

export default App;