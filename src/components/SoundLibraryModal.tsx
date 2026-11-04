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
}

export default function SoundLibraryModal({ isOpen, onClose }: SoundLibraryModalProps) {
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

        {/* Option List */}
        <div className="space-y-2">
          {SOUND_OPTIONS.map((opt: SoundOption) => {
            const isCurrent = selected === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectAndTest(opt.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-[#26231F] border-[#E5B35C]'
                    : 'bg-[#1C1A18] border-[#3A352E] hover:border-[#9A9184]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      {opt.label}
                      {isCurrent && (
                        <span className="text-[10px] bg-[#E5B35C] text-[#1A1206] px-1.5 py-0.2 rounded font-extrabold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9A9184] mt-0.5">{opt.desc}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAndTest(opt.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#121110] border border-[#3A352E] text-xs font-semibold text-[#E5B35C] hover:bg-[#E5B35C] hover:text-[#121110] transition-colors"
                >
                  ▶ Test
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-sm active:scale-[0.98] transition-transform"
        >
          Save & Apply Sound
        </button>
      </div>
    </div>
  );
}