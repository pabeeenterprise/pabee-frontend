import { useState, useEffect, useRef } from 'react';
import { Clock, Flame, CheckCircle2, ArrowLeft, XCircle, Volume2, VolumeX } from 'lucide-react';
import { playOrderAlert, unlockAudio } from '../utils/soundAlerts';

interface PickupScreenProps {
  orderId: string;
  tokenNumber?: string | number;
  onBack: () => void;
}

export default function PickupScreen({ orderId, tokenNumber, onBack }: PickupScreenProps) {
  const [status, setStatus] = useState<string>('pending');
  const [serverToken, setServerToken] = useState<string | null>(() => {
    if (tokenNumber) return String(tokenNumber);
    const savedId = localStorage.getItem('activeOrderId');
    return savedId === orderId ? localStorage.getItem('activeOrderToken') : null;
  });
  const [alertArmed, setAlertArmed] = useState<boolean>(true);

  const hasRungReadyRef = useRef<boolean>(false);
  const alertArmedRef = useRef<boolean>(alertArmed);

  useEffect(() => {
    alertArmedRef.current = alertArmed;
  }, [alertArmed]);

  // Unlock browser Web Audio on any tap inside the pickup screen
  useEffect(() => {
    const handleTap = () => {
      unlockAudio();
      window.removeEventListener('click', handleTap);
      window.removeEventListener('touchstart', handleTap);
    };
    window.addEventListener('click', handleTap);
    window.addEventListener('touchstart', handleTap);
    return () => {
      window.removeEventListener('click', handleTap);
      window.removeEventListener('touchstart', handleTap);
    };
  }, []);

  // Poll order status every 3s until terminal state (completed / cancelled / rejected)
  useEffect(() => {
    let isCancelledEffect = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const isTerminal = (s: string) =>
      s === 'completed' || s === 'cancelled' || s === 'rejected';

    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/orders/${orderId}/status`,
          { cache: 'no-store' }
        );
        if (!res.ok || isCancelledEffect) return;

        const data = await res.json();
        const nextStatus = data.kitchenStatus
          ? String(data.kitchenStatus).toLowerCase()
          : 'pending';

        if (data.token !== undefined && data.token !== null) {
          setServerToken(String(data.token));
        }

        setStatus(nextStatus);

        if (nextStatus === 'completed' && !hasRungReadyRef.current) {
          hasRungReadyRef.current = true;
          if (alertArmedRef.current) {
            playOrderAlert('digital_chime');
          }
        }

        if (isTerminal(nextStatus) && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (error) {
        console.error('Failed to fetch order status:', error);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000);

    return () => {
      isCancelledEffect = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [orderId]);

  const displayToken = serverToken || orderId.slice(-4).toUpperCase();
  const isTerminalState =
    status === 'completed' || status === 'cancelled' || status === 'rejected';

  return (
    <div className="max-w-md mx-auto p-6 mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* THE TOKEN */}
      <div className="mb-6">
        <p className="text-sm font-bold text-muted uppercase tracking-widest mb-1">
          Your Token Number
        </p>
        <h1 className="text-6xl font-black text-blue tracking-tighter tabular-nums">
          #{displayToken}
        </h1>
      </div>

      {/* SOUND READY ALERT TOGGLE (Also acts as explicit mobile audio unlock tap) */}
      {!isTerminalState && (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setAlertArmed((prev) => !prev);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-black/20 text-xs font-semibold text-muted hover:text-text transition-colors"
          >
            {alertArmed ? (
              <>
                <Volume2 size={15} className="text-green" />
                <span>Chime when ready: ON</span>
              </>
            ) : (
              <>
                <VolumeX size={15} className="text-red-400" />
                <span>Chime when ready: MUTED</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* LIVE STATUS UI */}
      <div className="space-y-4 relative">
        {status === 'pending' && (
          <div className="flex flex-col items-center p-8 border-2 border-blue bg-blue-soft rounded-2xl">
            <Clock className="w-12 h-12 mb-4 text-blue animate-pulse" />
            <h3 className="font-bold text-xl text-text">Order Received</h3>
            <p className="text-sm text-muted mt-2">Waiting for the kitchen to start cooking…</p>
          </div>
        )}

        {status === 'preparing' && (
          <div className="flex flex-col items-center p-8 border-2 border-amber bg-amber-soft rounded-2xl animate-in zoom-in-95 duration-300">
            <Flame className="w-12 h-12 mb-4 text-amber animate-bounce" />
            <h3 className="font-bold text-xl text-text">Currently Cooking</h3>
            <p className="text-sm text-amber mt-2 font-medium">Your food is on the grill!</p>
          </div>
        )}

        {status === 'completed' && (
          <div className="flex flex-col items-center p-8 border-2 border-green bg-green-soft rounded-2xl shadow-xl animate-in zoom-in-95 duration-300">
            <CheckCircle2 className="w-16 h-16 mb-4 text-green" />
            <h3 className="font-black text-2xl text-green uppercase tracking-wide">
              Ready for Pickup!
            </h3>
            <p className="text-sm text-green/80 mt-2 font-bold">
              Please show token #{displayToken} at the counter.
            </p>
          </div>
        )}

        {(status === 'cancelled' || status === 'rejected') && (
          <div className="flex flex-col items-center p-8 border-2 border-red-500 bg-red-50 rounded-2xl animate-in zoom-in-95 duration-300">
            <XCircle className="w-14 h-14 mb-4 text-red-500" />
            <h3 className="font-bold text-xl text-red-700">Order Cancelled</h3>
            <p className="text-sm text-red-600 mt-2">
              This order was cancelled by the counter. Please check with the stall staff if you already paid.
            </p>
          </div>
        )}
      </div>

      {/* BACK BUTTON (Available on Completed OR Cancelled) */}
      {isTerminalState && (
        <button
          onClick={onBack}
          className="mt-10 w-full bg-blue text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
        >
          <ArrowLeft size={20} /> Order More Food
        </button>
      )}
    </div>
  );
}