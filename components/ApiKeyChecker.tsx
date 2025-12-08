import React, { useEffect, useState, useCallback } from 'react';
import { Button } from './Button';
import { Key, ExternalLink } from 'lucide-react';

interface ApiKeyCheckerProps {
  onReady: () => void;
}

export const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onReady }) => {
  const [checking, setChecking] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);

  const checkKey = useCallback(async () => {
    try {
      // First check if API key is available from environment (.env.local)
      const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (envApiKey) {
        console.log("API key found in environment");
        onReady();
        setChecking(false);
        return;
      }

      // Fall back to checking Google AI Studio
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) {
        onReady();
      } else {
        setNeedsKey(true);
      }
    } catch (e) {
      console.error("Error checking API key status", e);
      setNeedsKey(true);
    } finally {
      setChecking(false);
    }
  }, [onReady]);

  useEffect(() => {
    checkKey();
  }, [checkKey]);

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Per guidelines, assume success immediately to avoid race condition delay
      onReady();
    } catch (e) {
      console.error("Error selecting key", e);
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
          To use the Gemini Nano Banana Pro model, you must select a paid API key from your Google Cloud project.
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleSelectKey} 
            className="w-full py-3 text-lg"
          >
            Select API Key
          </Button>
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-indigo-400 transition-colors"
          >
            View Billing Documentation
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};