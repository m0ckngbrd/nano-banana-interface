import React, { useState, useEffect, useRef } from 'react';
import { ApiKeyChecker } from './components/ApiKeyChecker';
import { HistorySidebar } from './components/HistorySidebar';
import { TemplateManager } from './components/TemplateManager';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { HistoryItem, PromptTemplate, GenerationSettings } from './types';
import { generateImageFromPrompt, MODEL_NAME } from './services/geminiService';
import { storage, isRunningInAIStudio } from './services/storageService';
import { Menu, Send, Sparkles, Download, Maximize2, Share2, Bookmark, Settings } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'banana_pro_history';
const LOCAL_STORAGE_TEMPLATES_KEY = 'banana_pro_templates';
const LOCAL_STORAGE_SETTINGS_KEY = 'banana_pro_settings';

const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: '1:1',
  resolution: '1K',
  temperature: 1.0,
};

const App: React.FC = () => {
  const [isApiKeyReady, setIsApiKeyReady] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      const savedHistory = await storage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      const savedTemplates = await storage.getItem(LOCAL_STORAGE_TEMPLATES_KEY);
      const savedSettings = await storage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    };
    loadData();
    
    // Log environment info
    console.log(`Running in ${isRunningInAIStudio() ? 'AI Studio' : 'local development'} mode`);
  }, []);

  // Persist data
  useEffect(() => {
    storage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    storage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    storage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const activeItem = history.find(h => h.id === currentItemId) || null;

  const handleGenerate = async (promptText: string = currentPrompt) => {
    if (!promptText.trim()) return;

    const newId = crypto.randomUUID();
    const newItem: HistoryItem = {
      id: newId,
      timestamp: Date.now(),
      prompt: promptText,
      status: 'generating'
    };

    setHistory(prev => [newItem, ...prev]);
    setCurrentItemId(newId);
    setCurrentPrompt(''); // Clear input

    try {
      // Pass the current settings to the service
      const imageUrl = await generateImageFromPrompt(promptText, settings);
      setHistory(prev => prev.map(item => 
        item.id === newId 
          ? { ...item, status: 'success', imageUrl } 
          : item
      ));
    } catch (error: any) {
      if (error.message === 'API_KEY_ERROR') {
        try {
          await window.aistudio.openSelectKey();
        } catch (e) {
          console.error("Key selection failed", e);
        }
        setHistory(prev => prev.filter(item => item.id !== newId)); // Remove failed item
        return;
      }

      setHistory(prev => prev.map(item => 
        item.id === newId 
          ? { ...item, status: 'error', errorMessage: error.message || "Failed to generate image." } 
          : item
      ));
    }
  };

  const handleTemplateAdd = (template: PromptTemplate) => {
    setTemplates(prev => [...prev, template]);
  };

  const handleTemplateRemove = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleUseTemplate = (content: string) => {
    setCurrentPrompt(content);
  };

  const handleDownload = (imageUrl: string, id: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `banana-pro-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMaskedApiKey = () => {
    const key = process.env.API_KEY || '';
    if (!key) return 'Not Set';
    if (key.length < 10) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  // If API key is not ready, show checker
  if (!isApiKeyReady) {
    return <ApiKeyChecker onReady={() => setIsApiKeyReady(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Sidebar */}
      <HistorySidebar 
        history={history}
        selectedId={currentItemId || undefined}
        onSelect={(item) => setCurrentItemId(item.id)}
        onClear={() => {
            if(confirm("Clear all history?")) {
                setHistory([]);
                setCurrentItemId(null);
            }
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative w-full">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent leading-none">
                Banana Pro Vision
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-700">
                  {MODEL_NAME}
                 </span>
                 <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1" title={process.env.API_KEY}>
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                   {getMaskedApiKey()}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
                variant="secondary"
                onClick={() => setIsSettingsModalOpen(true)}
                icon={<Settings size={18} />}
                className="w-10 px-0"
                title="Configuration"
            />
            <Button 
                variant="secondary" 
                onClick={() => setIsTemplateModalOpen(true)}
                icon={<Bookmark size={18} />}
                className="text-sm"
            >
                <span className="hidden sm:inline">Templates</span>
            </Button>
          </div>
        </header>

        {/* Viewport Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4">
          {activeItem ? (
            <div className="w-full max-w-4xl h-full flex flex-col gap-4 items-center justify-center">
              
              {/* Image Container */}
              <div className="relative w-full h-full max-h-[60vh] md:max-h-[70vh] flex items-center justify-center">
                 <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group max-w-full max-h-full">
                
                    {activeItem.status === 'generating' && (
                    <div className="flex flex-col items-center justify-center gap-4 text-indigo-400 p-20">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="animate-pulse font-medium tracking-wide">Dreaming...</p>
                    </div>
                    )}

                    {activeItem.status === 'error' && (
                    <div className="text-center p-8 text-red-400 max-w-md">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Generation Failed</h3>
                        <p className="text-sm opacity-80">{activeItem.errorMessage}</p>
                    </div>
                    )}

                    {activeItem.status === 'success' && activeItem.imageUrl && (
                    <>
                        <img 
                        src={activeItem.imageUrl} 
                        alt={activeItem.prompt} 
                        className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain"
                        />
                        
                        {/* Overlay Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                            onClick={() => handleDownload(activeItem.imageUrl!, activeItem.id)}
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                            title="Download"
                        >
                            <Download size={20} />
                        </button>
                        </div>
                    </>
                    )}
                 </div>
              </div>

              {/* Prompt Text Display */}
              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 w-full max-w-2xl border border-slate-700 shrink-0">
                 <p className="text-slate-300 text-sm md:text-base text-center line-clamp-3">
                   "{activeItem.prompt}"
                 </p>
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="text-center space-y-6 max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto border border-white/5">
                <Sparkles className="text-indigo-400 w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-white">Start Creating</h2>
              <p className="text-slate-400">
                Enter a prompt below to generate high-quality images with Gemini Nano Banana Pro.
              </p>
              <div className="flex gap-2 justify-center text-xs text-slate-500 font-mono">
                 <span>{settings.resolution}</span>
                 <span>•</span>
                 <span>{settings.aspectRatio}</span>
                 <span>•</span>
                 <span>T={settings.temperature}</span>
              </div>
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 z-20">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <div className="relative flex-1">
              <textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                    }
                }}
                placeholder="Describe your imagination... (e.g. A futuristic city made of crystal)"
                className="w-full bg-slate-800 text-white border-slate-700 rounded-xl px-4 py-3 min-h-[56px] max-h-32 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none scrollbar-hide"
                disabled={activeItem?.status === 'generating'}
              />
              <div className="absolute right-2 bottom-2 text-xs text-slate-500 pointer-events-none">
                {currentPrompt.length} chars
              </div>
            </div>
            
            <Button 
              onClick={() => handleGenerate()}
              disabled={!currentPrompt.trim() || activeItem?.status === 'generating'}
              className="h-[56px] w-[56px] rounded-xl flex items-center justify-center p-0 shrink-0"
              isLoading={activeItem?.status === 'generating'}
            >
              {!activeItem || activeItem.status !== 'generating' ? <Send size={24} /> : null}
            </Button>
          </div>
        </div>

      </div>

      <TemplateManager 
        templates={templates}
        onAdd={handleTemplateAdd}
        onRemove={handleTemplateRemove}
        onSelect={handleUseTemplate}
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
      
      <SettingsModal 
        settings={settings}
        onUpdate={setSettings}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

    </div>
  );
};

export default App;