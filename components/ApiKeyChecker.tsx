import React, { useEffect, useState, useCallback } from 'react';
import { Button } from './Button';
import { Eye, EyeOff, ExternalLink, Key } from 'lucide-react';
import { validateApiKey } from '../services/geminiService';
import { storage, STORAGE_KEYS } from '../services/storageService';

interface ApiKeyCheckerProps {
  onReady: (apiKey: string) => void;
  initialMessage?: string | null;
  forcePrompt?: boolean;
  onCancel?: () => void;
}

export const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({
  onReady,
  initialMessage,
  forcePrompt = false,
  onCancel,
}) => {
  const [checking, setChecking] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(initialMessage ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  const checkKey = useCallback(async () => {
    if (forcePrompt) {
      setNeedsKey(true);
      setChecking(false);
      return;
    }

    try {
      const savedApiKey = await storage.getItem(STORAGE_KEYS.apiKey);
      if (!savedApiKey) {
        setNeedsKey(true);
        return;
      }

      await validateApiKey(savedApiKey);
      onReady(savedApiKey);
    } catch (error) {
      console.error('Error checking API key status', error);
      await storage.removeItem(STORAGE_KEYS.apiKey);
      setErrorMessage('Enter a valid Gemini API key to continue.');
      setNeedsKey(true);
    } finally {
      setChecking(false);
    }
  }, [forcePrompt, onReady]);

  useEffect(() => {
    setErrorMessage(initialMessage ?? null);
  }, [initialMessage]);

  useEffect(() => {
    checkKey();
  }, [checkKey]);

  const handleSaveKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setErrorMessage('Enter a Gemini API key.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await validateApiKey(trimmedKey);
      await storage.setItem(STORAGE_KEYS.apiKey, trimmedKey);
      onReady(trimmedKey);
    } catch (error) {
      console.error('Error validating API key', error);
      if (error instanceof Error && error.message === 'API_KEY_ERROR') {
        setErrorMessage('That API key was rejected by Gemini. Check the key and billing configuration.');
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to validate the API key right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!needsKey) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="text-indigo-500" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">API Key Required</h1>
        <p className="text-slate-400 mb-6">
          Enter a Gemini API key to store locally in the extension environment. The key is used only for Gemini API requests.
        </p>
        
        <div className="space-y-4">
          <div className="text-left">
            <label htmlFor="gemini-api-key" className="block text-sm font-medium text-slate-300 mb-2">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                id="gemini-api-key"
                type={isKeyVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSaveKey();
                  }
                }}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-4 pr-12 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setIsKeyVisible((value) => !value)}
                className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-white"
                aria-label={isKeyVisible ? 'Hide API key' : 'Show API key'}
              >
                {isKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-left">
              {errorMessage}
            </p>
          )}

          <Button
            onClick={handleSaveKey}
            className="w-full py-3 text-lg"
            isLoading={isSubmitting}
          >
            Save API Key
          </Button>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          )}
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-indigo-400 transition-colors"
          >
            Gemini Billing Documentation
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};