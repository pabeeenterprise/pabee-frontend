import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function MyQRCode({ vendorId }: { vendorId: string }) {
  const [tableId, setTableId] = useState('Table-1');
  const [vendorName, setVendorName] = useState('Loading...'); // 👈 New State

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://project-r73rm.vercel.app';
  const qrPayload = `${baseUrl}/?vendor=${vendorId}&table=${tableId}`;

  // 👈 NEW: Fetch the real restaurant name from the database!
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`https://pabee-backend.onrender.com/api/vendors/${vendorId}/profile`);
        if (res.ok) {
          const data = await res.json();
          setVendorName(data.name);
        } else {
          setVendorName('Your Restaurant');
        }
      } catch (error) {
        console.error("Failed to fetch name", error);
        setVendorName('Your Restaurant');
      }
    };
    
    // Only fetch if the vendorId isn't the fake dummy ID
    if (vendorId && !vendorId.includes('123e1f00')) {
        fetchProfile();
    }
  }, [vendorId]);

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">My QR code</h1>
        <p className="text-xs text-gray-500">Generate • Print • Stick on tables</p>
      </div>

      {/* Centered QR Card Area */}
      <div className="flex-1 flex justify-center mt-4">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-8 flex flex-col items-center max-w-sm w-full h-fit shadow-2xl">
          
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">Scan to order from</p>
          {/* 👈 NEW: Dynamic Name Rendering */}
          <h2 className="text-2xl font-serif text-white mb-6 text-center tracking-wide">{vendorName}</h2>

          {/* Table Selector */}
          <div className="flex items-center gap-3 mb-6 bg-[#0B0E14] border border-gray-800 rounded-lg p-1.5 px-3 w-full">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Location:</span>
            <input 
              type="text" 
              value={tableId}
              onChange={(e) => setTableId(e.target.value.replace(/\s+/g, '-'))}
              className="bg-transparent outline-none text-white text-sm font-bold w-full"
              placeholder="e.g. Table-1"
            />
          </div>

          {/* REAL, SCANNABLE QR CODE */}
          <div className="bg-white p-4 rounded-xl mb-6 shadow-sm border-4 border-gray-800">
            <QRCodeSVG 
              value={qrPayload} 
              size={180} 
              level={"H"}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              includeMargin={false}
            />
          </div>

          {/* Data Payload Display */}
          <p className="text-xs text-gray-400 mb-6 font-mono tracking-wide bg-gray-900 px-3 py-1.5 rounded text-center break-all">
            {qrPayload}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 rounded-lg text-sm hover:bg-[#d4a24b] transition-all"
            >
              Print QR
            </button>
            <button className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-2.5 rounded-lg text-sm hover:text-white hover:border-gray-400 transition-colors">
              Download
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-6 leading-relaxed px-4">
            Print this code and stick it on {tableId.replace('-', ' ')}. Customers will instantly see your menu when scanned.
          </p>
          
        </div>
      </div>
      
    </div>
  );
}