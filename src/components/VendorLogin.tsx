import { useState } from 'react';

export default function VendorLogin({ onLoginSuccess, vendorId }: { onLoginSuccess: (token: string) => void, vendorId: string }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, passcode })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-panel border border-line rounded-lg shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-text">Vendor Portal</h1>
        <p className="text-xs text-muted mt-1">Enter your secure PIN to access the dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted mb-2">STORE ID</label>
          <input 
            type="text" 
            value={vendorId} 
            disabled
            className="w-full border border-line rounded p-3 text-sm bg-panel-soft text-muted cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted mb-2">4-DIGIT PIN</label>
          <input 
            type="password" 
            maxLength={4}
            value={passcode} 
            onChange={(e) => setPasscode(e.target.value)} 
            placeholder="••••" 
            className="w-full border border-line rounded p-3 text-center text-2xl tracking-[1em] focus:outline-none focus:border-blue"
          />
        </div>

        {error && <div className="text-red bg-red-soft p-2 text-xs font-bold rounded text-center">{error}</div>}

        <button 
          type="submit" 
          disabled={loading || passcode.length < 4}
          className="w-full bg-text text-white py-3 rounded-md font-bold transition-colors hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Login securely'}
        </button>
      </form>
    </div>
  );
}