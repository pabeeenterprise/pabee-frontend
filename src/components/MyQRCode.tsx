import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function MyQRCode({ vendorId }: { vendorId: string }) {
  const [tableId, setTableId] = useState('Table-1');
  const [vendorName, setVendorName] = useState('Loading...');
  const [isDownloading, setIsDownloading] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://project-r73rm.vercel.app';
  const qrPayload = `${baseUrl}/?vendor=${vendorId}&table=${tableId}`;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${vendorId}/profile`);
        if (res.ok) {
          const data = await res.json();
          setVendorName(data.name || 'Our Kitchen');
        } else {
          setVendorName('Our Kitchen');
        }
      } catch (error) {
        setVendorName('Our Kitchen');
      }
    };
    
    if (vendorId && !vendorId.includes('123e1f00')) {
      fetchProfile();
    }
  }, [vendorId]);

  // 🎨 HIGH-RES TENT-CARD GENERATOR & DOWNLOADER
  const handleDownloadCard = () => {
    setIsDownloading(true);
    const svgElement = document.getElementById('table-qr-svg');
    if (!svgElement) {
      setIsDownloading(false);
      return;
    }

    // 1. Serialize SVG to Image Data URI
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const qrImage = new Image();
    qrImage.onload = () => {
      // 2. Set Up 1200 x 1600 Canvas (Print-Ready 300 DPI A6 aspect ratio)
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#FAF7F2'; // Warm, ink-friendly ivory
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Accent Border
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#E5B35C';
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Stall / Counter Header
      ctx.fillStyle = '#1A140E';
      ctx.font = 'bold 64px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(vendorName.toUpperCase(), 600, 180);

      // Subheading
      ctx.fillStyle = '#8A7560';
      ctx.font = '600 28px "DM Sans", sans-serif';
      ctx.fillText('CONTACTLESS MENU & ORDERING', 600, 230);

      // Table Badge Box
      ctx.fillStyle = '#1C1008';
      ctx.beginPath();
      ctx.roundRect(400, 270, 400, 70, [12]);
      ctx.fill();

      ctx.fillStyle = '#E5B35C';
      ctx.font = 'bold 32px "DM Sans", sans-serif';
      ctx.fillText(tableId.replace('-', ' ').toUpperCase(), 600, 316);

      // QR Background Container Plate
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.beginPath();
      ctx.roundRect(250, 390, 700, 700, [32]);
      ctx.fill();
      ctx.shadowColor = 'transparent'; // Reset shadow

      // Draw QR Code
      ctx.drawImage(qrImage, 320, 460, 560, 560);

      // 1. Primary Headline
      ctx.fillStyle = '#1C1008';
      ctx.font = 'bold 44px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to View Menu & Order', 600, 1150);

      // 2. Google Search Pill Graphic
      const pillX = 220;
      const pillY = 1190;
      const pillW = 760;
      const pillH = 100;
      const pillR = 50;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#D9CEBF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, [pillR]);
      ctx.fill();
      ctx.stroke();

      // Stylized 'G' Icon
      ctx.fillStyle = '#4285F4';
      ctx.font = 'bold 42px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('G', pillX + 35, pillY + 64);

      // "Tap" text
      ctx.fillStyle = '#2C2218';
      ctx.font = '600 28px "DM Sans", sans-serif';
      ctx.fillText('Tap', pillX + 90, pillY + 62);

      // Camera Button Accent Badge
      ctx.fillStyle = '#E5B35C';
      ctx.beginPath();
      ctx.roundRect(pillX + 150, pillY + 22, 60, 56, [14]);
      ctx.fill();

      // Camera Emoji inside Badge
      ctx.fillStyle = '#1C1008';
      ctx.font = '30px "DM Sans", sans-serif';
      ctx.fillText('📷', pillX + 162, pillY + 61);

      // Home Screen Callout
      ctx.fillStyle = '#2C2218';
      ctx.font = '600 28px "DM Sans", sans-serif';
      ctx.fillText('on your home screen', pillX + 225, pillY + 62);

      // 3. Fallback Note
      ctx.fillStyle = '#7A6B5B';
      ctx.font = '500 24px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Standard camera or Google Lens works instantly on all Android phones', 600, 1340);

      // Footer
      ctx.fillStyle = '#B0A290';
      ctx.font = 'bold 22px "DM Sans", sans-serif';
      ctx.fillText('POWERED BY PABEE POS', 600, 1470);

      // 3. Trigger PNG Download
      const link = document.createElement('a');
      link.download = `${vendorName.replace(/\s+/g, '_')}_${tableId}_QR.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      URLObject.revokeObjectURL(blobURL);
      setIsDownloading(false);
    };

    qrImage.src = blobURL;
  };

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div>
        <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">My QR Code</h1>
        <p className="text-xs text-gray-500">Generate high-res table standees and stickers.</p>
      </div>

      <div className="flex-1 flex justify-center mt-4">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-2xl p-8 flex flex-col items-center max-w-sm w-full h-fit shadow-2xl">
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-2">Scan to order from</p>
          <h2 className="text-2xl font-serif text-white mb-5 text-center tracking-wide">{vendorName}</h2>

          {/* Location / Table Input */}
          <div className="flex items-center gap-3 mb-6 bg-[#0B0E14] border border-gray-800 rounded-lg p-2 px-3 w-full">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Location:</span>
            <input 
              type="text" 
              value={tableId} 
              onChange={(e) => setTableId(e.target.value.replace(/\s+/g, '-'))}
              className="bg-transparent outline-none text-white text-sm font-bold w-full"
              placeholder="e.g. Table-1"
            />
          </div>

          {/* Scannable Target SVG */}
          <div className="bg-white p-4 rounded-xl mb-4 shadow-sm border-4 border-gray-800">
            <QRCodeSVG 
              id="table-qr-svg"
              value={qrPayload} 
              size={180} 
              level={"H"}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              includeMargin={false}
            />
          </div>

          <p className="text-xs text-gray-400 mb-6 font-mono tracking-wide bg-gray-900 px-3 py-1.5 rounded text-center break-all w-full">
            {qrPayload}
          </p>

          <div className="flex gap-3 w-full">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-2.5 rounded-lg text-xs hover:text-white hover:border-gray-400 transition-colors"
            >
              Print
            </button>
            <button 
              onClick={handleDownloadCard}
              disabled={isDownloading}
              className="flex-1 bg-[#E5B35C] text-[#0B0E14] font-bold py-2.5 rounded-lg text-xs hover:bg-[#d4a24b] transition-all disabled:opacity-50"
            >
              {isDownloading ? 'Generating...' : 'Download Standee'}
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-5 leading-relaxed px-2">
            Downloading generates a 300 DPI tent card formatted for acrylic table stands.
          </p>
        </div>
      </div>
    </div>
  );
}