import { useState } from 'react';
import {
  SOUND_OPTIONS,
  SoundPreset,
  SoundOption,
  getSavedSoundPreset,
  saveSoundPreset,
  playOrderAlert,
  unlockAudio,
} from '../utils/soundAlerts';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function SoundLibraryModal({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
}: SoundLibraryModalProps) {
  const [selected, setSelected] = useState<SoundPreset>(getSavedSoundPreset());

  if (!isOpen) return null;

  const handleSelectAndTest = (id: SoundPreset) => {
    unlockAudio();
    setSelected(id);
    saveSoundPreset(id);
    playOrderAlert(id);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-9 h-1 rounded-full bg-[#3A352E] mx-auto sm:hidden" />

        <div className="flex justify-between items-center pb-2 border-b border-[#3A352E]">
          <div>
            <h3 className="text-lg font-bold text-white">Order Bell Library</h3>
            <p className="text-xs text-[#9A9184] mt-0.5">
              Select and preview incoming order ringtones
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Master Mute / Unmute Switch */}
        <div className="p-3.5 rounded-xl bg-[#26231F] border border-[#3A352E] flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-white block">
              Audio Notifications
            </span>
            <span className="text-xs text-[#9A9184]">
              {soundEnabled ? 'Alerts will sound on new orders' : 'Terminal is currently muted'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            className="flex items-center min-h-[44px]"
          >
            <span
              className={`w-11 h-6 rounded-full relative transition-colors ${
                soundEnabled ? 'bg-[#5CC97B]' : 'bg-[#3A352E]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Unified Prototype Divided List Container */}
        <div className="bg-[#1C1A18] border border-[#3A352E] rounded-2xl divide-y divide-[#3A352E] overflow-hidden">
          {SOUND_OPTIONS.filter((opt) => opt.id !== 'audio_file').map((opt: SoundOption) => {
            const isCurrent = selected === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectAndTest(opt.id)}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                  isCurrent ? 'bg-[#26231F]' : 'hover:bg-[#26231F]/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="text-xl shrink-0">{opt.icon}</span>
                  <div className="truncate">
                    <div className="text-sm font-semibold text-white flex items-center gap-2 truncate">
                      <span>{opt.label}</span>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E5B35C] shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-[#9A9184] truncate mt-0.5">{opt.desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAndTest(opt.id);
                    }}
                    className="min-h-[32px] px-3 rounded-full border border-[#3A352E] bg-[#121110] text-xs font-semibold text-[#E5B35C] hover:bg-[#E5B35C] hover:text-[#121110] transition-colors"
                  >
                    Test
                  </button>
                  {isCurrent ? (
                    <span className="w-6 text-center text-[#5CC97B] font-bold text-sm">✓</span>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-sm active:scale-[0.98] transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}