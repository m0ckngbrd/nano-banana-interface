import React from 'react';
import { GenerationSettings } from '../types';
import { X, RotateCcw, Settings as SettingsIcon, Monitor, Box, Thermometer, DollarSign, Key } from 'lucide-react';
import { Button } from './Button';
import { getCostEstimate } from '../extension/shared/costEstimator';

interface SettingsModalProps {
  settings: GenerationSettings;
  onUpdate: (settings: GenerationSettings) => void;
  apiKey?: string;
  onUpdateApiKey?: (apiKey: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: '1:1',
  resolution: '1K',
  temperature: 1.0,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdate,
  apiKey,
  onUpdateApiKey,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onUpdate(DEFAULT_SETTINGS);
  };

  const ratios: { label: string; value: GenerationSettings['aspectRatio']; iconClass: string }[] = [
    { label: 'Auto', value: 'Auto', iconClass: 'w-6 h-6 border-dashed rounded-md' },
    { label: 'Square (1:1)', value: '1:1', iconClass: 'aspect-square w-6' },
    { label: 'Standard (4:3)', value: '4:3', iconClass: 'aspect-[4/3] w-8' },
    { label: 'Portrait (3:4)', value: '3:4', iconClass: 'aspect-[3/4] w-6' },
    { label: 'Classic (3:2)', value: '3:2', iconClass: 'aspect-[3/2] w-8' },
    { label: 'Photo (2:3)', value: '2:3', iconClass: 'aspect-[2/3] w-5' },
    { label: 'Wide (16:9)', value: '16:9', iconClass: 'aspect-video w-8' },
    { label: 'Story (9:16)', value: '9:16', iconClass: 'aspect-[9/16] w-5' },
    { label: 'Cinema (21:9)', value: '21:9', iconClass: 'aspect-[21/9] w-10' },
    { label: 'Tall (4:5)', value: '4:5', iconClass: 'aspect-[4/5] w-6' },
    { label: 'Wide (5:4)', value: '5:4', iconClass: 'aspect-[5/4] w-8' },
  ];

  const resolutions: GenerationSettings['resolution'][] = ['1K', '2K', '4K'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="text-indigo-400" />
            Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">

          {/* API Key (optional) */}
          {typeof apiKey === 'string' && typeof onUpdateApiKey === 'function' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                <Key size={16} className="text-indigo-400" />
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => onUpdateApiKey(e.target.value)}
                placeholder="Paste your key..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-slate-500 px-1">
                Stored in Chrome storage. Needed to generate images.
              </p>
            </div>
          )}
          
          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
              <Box size={16} className="text-indigo-400" />
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ratios.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => onUpdate({ ...settings, aspectRatio: ratio.value })}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    settings.aspectRatio === ratio.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                  }`}
                  title={ratio.label}
                >
                  <div className={`border-2 rounded-sm bg-current/10 ${ratio.iconClass} ${settings.aspectRatio === ratio.value ? 'border-indigo-400' : 'border-slate-500'}`} />
                  <span className="text-[10px] font-medium whitespace-nowrap">{ratio.value === 'Auto' ? 'Auto' : ratio.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                <Monitor size={16} className="text-indigo-400" />
                Resolution
                </label>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                    <DollarSign size={10} />
                    <span>Est. {getCostEstimate('', settings.resolution)}</span>
                </div>
                <p className="text-[10px] text-slate-500 px-1">
                  Image only (text input cost varies by prompt length)
                </p>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              {resolutions.map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdate({ ...settings, resolution: res })}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    settings.resolution === res
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 px-1">
                Higher resolutions consume more tokens. 4K images cost approximately 2x as much as 1K images.
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                <Thermometer size={16} className="text-indigo-400" />
                Temperature
              </label>
              <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-indigo-300 border border-slate-700">
                {settings.temperature.toFixed(1)}
              </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => onUpdate({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Precise (0.0)</span>
              <span>Creative (2.0)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/30 rounded-b-2xl flex justify-between shrink-0">
          <Button 
            variant="ghost" 
            onClick={handleReset}
            className="text-slate-400 hover:text-white"
            icon={<RotateCcw size={16} />}
          >
            Reset Defaults
          </Button>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};