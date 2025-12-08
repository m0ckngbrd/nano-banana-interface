import React from 'react';
import { HistoryItem } from '../types';
import { Clock, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  selectedId?: string;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  history, 
  onSelect, 
  selectedId, 
  onClear,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className={`fixed md:static inset-y-0 left-0 w-72 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700 transform transition-transform duration-300 z-30 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-indigo-400" />
            History
          </h2>
          {history.length > 0 && (
            <button 
              onClick={onClear}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <p>No history yet.</p>
              <p className="text-sm mt-2">Generate an image to start!</p>
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                  selectedId === item.id
                    ? 'bg-indigo-900/30 border-indigo-500/50 shadow-lg shadow-indigo-900/20'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-slate-400">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {item.status === 'waiting' || item.status === 'generating' ? (
                     <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                  ) : item.status === 'error' ? (
                     <AlertCircle size={14} className="text-red-400" />
                  ) : (
                     <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <p className="text-sm text-slate-200 line-clamp-2 font-medium mb-2">
                  {item.prompt}
                </p>
                {item.imageUrl && (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-900">
                     <img src={item.imageUrl} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
};