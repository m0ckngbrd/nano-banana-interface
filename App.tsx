import React, { useEffect, useRef, useState } from 'react';
import { ApiKeyChecker } from './components/ApiKeyChecker';
import { HistorySidebar } from './components/HistorySidebar';
import { TemplateManager } from './components/TemplateManager';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { HistoryItem, PromptTemplate, GenerationSettings } from './types';
import { generateImageFromPrompt, MODEL_NAME } from './services/geminiService';
import { imageStorage } from './services/imageStorageService';
import { getActivePageContext } from './services/pageContextService';
import { STORAGE_KEYS, storage } from './services/storageService';
import { hasTemplatePlaceholders, resolveTemplatePrompt } from './services/templateService';
import { Bookmark, Download, Menu, Plus, Send, Settings, Sparkles } from 'lucide-react';

const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: '1:1',
  resolution: '1K',
  temperature: 1.0,
};

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default_detailed_infographic',
    name: 'Detailed, creative infographic',
    content:
      'Create a detailed, creative infographic image that represents the key ideas and learnings from this page:\n\nTitle: {{title}}\nURL: {{url}}\n\n{{pageText}}',
    isDefault: true,
  },
  {
    id: 'default_cover_image',
    name: 'Hero banner image',
    content:
      'Generate a professional hero banner image suitable for a website header, inspired by the content of this page:\n\nTitle: {{title}}\nURL: {{url}}\n\n{{pageText}}',
    isDefault: true,
  },
  {
    id: 'default_illustration',
    name: 'Illustration',
    content:
      'Create an illustration that captures the essence of this content:\n\n{{pageText}}',
    isDefault: true,
  },
  {
    id: 'default_concept_art',
    name: 'Concept art',
    content:
      'Generate concept art based on the ideas and themes described here:\n\n{{pageText}}',
    isDefault: true,
  },
];

const IMAGE_STORAGE_PREFIX = 'banana_pro_image_';
const MAX_RESOLVED_PROMPT_PREVIEW_LENGTH = 4000;

const maskApiKey = (apiKey: string): string => {
  if (!apiKey) return 'Not Set';
  if (apiKey.length < 10) return '********';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
};

const parseStoredValue = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
};

const mergeTemplates = (savedTemplates: PromptTemplate[]): PromptTemplate[] => {
  const templatesById = new Map<string, PromptTemplate>();

  DEFAULT_TEMPLATES.forEach((template) => {
    templatesById.set(template.id, template);
  });

  savedTemplates.forEach((template) => {
    templatesById.set(template.id, template);
  });

  return Array.from(templatesById.values());
};

const createResolvedPromptPreview = (resolvedPrompt: string, rawPrompt: string): string | undefined => {
  if (resolvedPrompt === rawPrompt) {
    return undefined;
  }

  if (resolvedPrompt.length <= MAX_RESOLVED_PROMPT_PREVIEW_LENGTH) {
    return resolvedPrompt;
  }

  return `${resolvedPrompt.slice(0, MAX_RESOLVED_PROMPT_PREVIEW_LENGTH)}...`;
};

const serializeHistory = (items: HistoryItem[]): HistoryItem[] =>
  items.map(({ imageUrl, ...item }) => item);

const createPreviewImage = async (imageUrl: string): Promise<string> => {
  if (!imageUrl.startsWith('data:image/')) {
    return imageUrl;
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const maxDimension = 256;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        resolve(imageUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => resolve(imageUrl);
    image.src = imageUrl;
  });
};

const App: React.FC = () => {
  const loadingImageIdsRef = useRef<Set<string>>(new Set());
  const [isApiKeyReady, setIsApiKeyReady] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMessage, setApiKeyMessage] = useState<string | null>(null);
  const [isManagingApiKey, setIsManagingApiKey] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pageContextError, setPageContextError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [savedHistory, savedTemplates, savedSettings] = await Promise.all([
          storage.getItem(STORAGE_KEYS.history),
          storage.getItem(STORAGE_KEYS.templates),
          storage.getItem(STORAGE_KEYS.settings),
        ]);

        if (!isMounted) {
          return;
        }

        try {
          setHistory(parseStoredValue<HistoryItem[]>(savedHistory, []));
        } catch (error) {
          console.error('Failed to parse saved history:', error);
          setStorageError('Saved history could not be fully restored.');
        }

        try {
          setTemplates(mergeTemplates(parseStoredValue<PromptTemplate[]>(savedTemplates, [])));
        } catch (error) {
          console.error('Failed to parse saved templates:', error);
          setStorageError('Some saved templates could not be restored.');
          setTemplates(DEFAULT_TEMPLATES);
        }

        try {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parseStoredValue<Partial<GenerationSettings>>(savedSettings, {}),
          });
        } catch (error) {
          console.error('Failed to parse saved settings:', error);
          setStorageError('Saved settings could not be restored.');
        }
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    storage
      .setItem(STORAGE_KEYS.history, JSON.stringify(serializeHistory(history)))
      .then(() => setStorageError(null))
      .catch((error) => {
        console.error('Failed to persist history:', error);
        setStorageError('Unable to save history locally.');
      });
  }, [history, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    storage
      .setItem(STORAGE_KEYS.templates, JSON.stringify(templates))
      .then(() => setStorageError(null))
      .catch((error) => {
        console.error('Failed to persist templates:', error);
        setStorageError('Unable to save templates locally.');
      });
  }, [templates, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    storage
      .setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
      .then(() => setStorageError(null))
      .catch((error) => {
        console.error('Failed to persist settings:', error);
        setStorageError('Unable to save settings locally.');
      });
  }, [settings, isHydrated]);

  const activeItem = history.find(h => h.id === currentItemId) || null;
  const isGenerating = history.some((item) => item.status === 'generating');

  useEffect(() => {
    if (!activeItem || activeItem.status !== 'success' || activeItem.imageUrl || !activeItem.imageStorageKey) {
      return;
    }

    if (loadingImageIdsRef.current.has(activeItem.id)) {
      return;
    }

    let cancelled = false;
    loadingImageIdsRef.current.add(activeItem.id);

    imageStorage
      .getItem(activeItem.imageStorageKey)
      .then((storedImage) => {
        if (!storedImage || cancelled) {
          return;
        }

        setHistory((previous) =>
          previous.map((item) => (item.id === activeItem.id ? { ...item, imageUrl: storedImage } : item)),
        );
      })
      .catch((error) => {
        console.error('Failed to load stored image:', error);
        setStorageError('Unable to restore a previously generated image.');
      })
      .finally(() => {
        loadingImageIdsRef.current.delete(activeItem.id);
      });

    return () => {
      cancelled = true;
    };
  }, [activeItem]);

  const handleApiKeyReady = (readyApiKey: string) => {
    setApiKey(readyApiKey);
    setApiKeyMessage(null);
    setPageContextError(null);
    setIsManagingApiKey(false);
    setIsApiKeyReady(true);
  };

  const handleApiKeyInvalid = async (promptText: string, failedItemId: string) => {
    try {
      await storage.removeItem(STORAGE_KEYS.apiKey);
    } catch (error) {
      console.error('Failed to clear invalid API key:', error);
    }

    setApiKey('');
    setApiKeyMessage('Your saved Gemini API key was rejected. Enter a new key to continue.');
    setPageContextError(null);
    setCurrentPrompt(promptText);
    setCurrentItemId(null);
    setIsApiKeyReady(false);
    setIsManagingApiKey(false);
    setHistory((previous) => previous.filter((item) => item.id !== failedItemId));
  };

  const handleGenerate = async (promptText: string = currentPrompt) => {
    if (!promptText.trim() || !apiKey.trim() || isGenerating) return;

    const rawPrompt = promptText.trim();
    let resolvedPrompt = rawPrompt;

    setPageContextError(null);

    if (hasTemplatePlaceholders(rawPrompt)) {
      try {
        const pageContext = await getActivePageContext();
        resolvedPrompt = resolveTemplatePrompt(rawPrompt, pageContext).trim();
      } catch (error) {
        console.error('Failed to resolve template placeholders:', error);
        setPageContextError(error instanceof Error ? error.message : 'Unable to resolve placeholders from the current page.');
        return;
      }
    }

    const newId = crypto.randomUUID();
    const newItem: HistoryItem = {
      id: newId,
      timestamp: Date.now(),
      prompt: rawPrompt,
      resolvedPrompt: createResolvedPromptPreview(resolvedPrompt, rawPrompt),
      status: 'generating'
    };

    setHistory(prev => [newItem, ...prev]);
    setCurrentItemId(newId);
    setCurrentPrompt('');
    setIsPromptExpanded(false);

    try {
      const imageUrl = await generateImageFromPrompt(apiKey, resolvedPrompt, settings);
      const previewImageUrl = await createPreviewImage(imageUrl);
      const imageStorageKey = `${IMAGE_STORAGE_PREFIX}${newId}`;

      let persistedImageKey: string | undefined;
      try {
        await imageStorage.setItem(imageStorageKey, imageUrl);
        persistedImageKey = imageStorageKey;
      } catch (error) {
        console.error('Failed to persist generated image:', error);
        setStorageError('The image was generated, but it could not be saved for future sessions.');
      }

      setHistory(prev => prev.map(item =>
        item.id === newId
          ? { ...item, status: 'success', imageUrl, previewImageUrl, imageStorageKey: persistedImageKey }
          : item
      ));
    } catch (error) {
      if (error instanceof Error && (error.message === 'API_KEY_ERROR' || error.message === 'API_KEY_MISSING')) {
        await handleApiKeyInvalid(rawPrompt, newId);
        return;
      }

      setHistory(prev => prev.map(item =>
        item.id === newId
          ? {
              ...item,
              status: 'error',
              errorMessage: error instanceof Error ? error.message : 'Failed to generate image.',
            }
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

  const handleNewChat = () => {
    setCurrentItemId(null);
    setCurrentPrompt('');
    setIsPromptExpanded(false);
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear all history?")) {
      return;
    }

    const imageKeys = history
      .map((item) => item.imageStorageKey)
      .filter((key): key is string => Boolean(key));

    try {
      await Promise.all(imageKeys.map((key) => imageStorage.removeItem(key)));
    } catch (error) {
      console.error('Failed to remove stored images:', error);
      setStorageError('Some stored images could not be removed.');
    }

    setHistory([]);
    setCurrentItemId(null);
    setIsPromptExpanded(false);
  };

  if (!isApiKeyReady || isManagingApiKey) {
    return (
      <ApiKeyChecker
        onReady={handleApiKeyReady}
        initialMessage={apiKeyMessage}
        forcePrompt={isManagingApiKey}
        onCancel={isManagingApiKey ? () => setIsManagingApiKey(false) : undefined}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Sidebar */}
      <HistorySidebar 
        history={history}
        selectedId={currentItemId || undefined}
        onSelect={(item) => setCurrentItemId(item.id)}
        onClear={() => void handleClearHistory()}
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
                 <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1" title="Gemini API key stored locally">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                   {maskApiKey(apiKey)}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
                variant="secondary"
                onClick={handleNewChat}
                icon={<Plus size={18} />}
                className="text-sm"
                title="New Chat"
                disabled={isGenerating}
            >
                <span className="hidden sm:inline">New</span>
            </Button>
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
          {pageContextError && (
            <div className="w-full max-w-4xl mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {pageContextError}
            </div>
          )}

          {storageError && (
            <div className="w-full max-w-4xl mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {storageError}
            </div>
          )}

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

                    {activeItem.status === 'success' && (activeItem.imageUrl || activeItem.previewImageUrl) && (
                    <>
                        <img 
                        src={activeItem.imageUrl || activeItem.previewImageUrl} 
                        alt={activeItem.resolvedPrompt || activeItem.prompt} 
                        className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain"
                        />
                        
                        {/* Overlay Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                            onClick={() => activeItem.imageUrl && handleDownload(activeItem.imageUrl, activeItem.id)}
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                            title="Download"
                            disabled={!activeItem.imageUrl}
                        >
                            <Download size={20} />
                        </button>
                        </div>
                    </>
                    )}
                 </div>
              </div>

              {/* Prompt Text Display */}
              <div 
                className="bg-slate-800/80 backdrop-blur rounded-xl p-4 w-full max-w-2xl border border-slate-700 shrink-0 cursor-pointer hover:bg-slate-800/90 transition-colors"
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                title="Click to expand/collapse"
              >
                 {activeItem.resolvedPrompt && (
                   <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-300 mb-3 text-center">
                     Template Prompt
                   </div>
                 )}
                 <div className={`text-slate-300 text-sm md:text-base text-center ${isPromptExpanded ? 'max-h-60 overflow-y-auto' : 'line-clamp-3'}`}>
                   "{activeItem.prompt}"
                 </div>
                 {!isPromptExpanded && activeItem.prompt.length > 150 && (
                   <div className="text-xs text-slate-500 text-center mt-2">
                     Click to see full prompt
                   </div>
                 )}
              </div>

              {activeItem.resolvedPrompt && (
                <div className="bg-slate-900/80 backdrop-blur rounded-xl p-4 w-full max-w-2xl border border-slate-800 shrink-0">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-300 mb-3 text-center">
                    Prompt Sent To Gemini
                  </div>
                  <div className={`text-slate-300 text-sm md:text-base text-center ${isPromptExpanded ? 'max-h-60 overflow-y-auto' : 'line-clamp-3'}`}>
                    "{activeItem.resolvedPrompt}"
                  </div>
                </div>
              )}

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
                disabled={isGenerating}
              />
              <div className="absolute right-2 bottom-2 text-xs text-slate-500 pointer-events-none">
                {currentPrompt.length} chars
              </div>
            </div>
            
            <Button 
              onClick={() => handleGenerate()}
              disabled={!currentPrompt.trim() || isGenerating}
              className="h-[56px] w-[56px] rounded-xl flex items-center justify-center p-0 shrink-0"
              isLoading={isGenerating}
            >
              {!isGenerating ? <Send size={24} /> : null}
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
        apiKeyLabel={maskApiKey(apiKey)}
        onManageApiKey={() => {
          setIsSettingsModalOpen(false);
          setApiKeyMessage('Enter a replacement Gemini API key.');
          setIsManagingApiKey(true);
        }}
      />

    </div>
  );
};

export default App;