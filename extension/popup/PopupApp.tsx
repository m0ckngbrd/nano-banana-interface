import React, { useEffect, useMemo, useState } from "react";
import { Bookmark, Download, RefreshCcw, Send, Settings } from "lucide-react";

import { Button } from "../../components/Button";
import { TemplateManager } from "../../components/TemplateManager";
import { SettingsModal } from "../../components/SettingsModal";
import type { GenerationSettings, PromptTemplate } from "../../types";
import type { BgRequest, BgResponse } from "../shared/messages";
import { DEFAULT_SETTINGS } from "../shared/types";

type CapturedPage = { title: string; url: string; text: string; method: string };

async function bg<T extends BgResponse>(req: BgRequest): Promise<T> {
  const res = await chrome.runtime.sendMessage(req);
  if (!res?.ok) throw new Error(res?.error || "Request failed");
  return res.result as T;
}

export const PopupApp: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const [captured, setCaptured] = useState<CapturedPage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showCapturePreview, setShowCapturePreview] = useState(true);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [builtPrompt, setBuiltPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = await bg<{ type: "config.get"; config: any }>({ type: "config.get" });
      setApiKey(cfg.config.apiKey ?? "");
      setSettings(cfg.config.settings ?? DEFAULT_SETTINGS);
      setSelectedTemplateId(cfg.config.selectedTemplateId ?? "");

      const t = await bg<{ type: "templates.get"; templates: PromptTemplate[] }>({ type: "templates.get" });
      setTemplates(t.templates);
      if (!cfg.config.selectedTemplateId && t.templates.length > 0) {
        setSelectedTemplateId(t.templates[0].id);
      }
    })().catch((e) => {
      console.error(e);
    });
  }, []);

  useEffect(() => {
    // persist config
    bg({ type: "config.set", config: { apiKey, settings, selectedTemplateId } }).catch(() => {});
  }, [apiKey, settings, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  async function handleCapture() {
    setIsCapturing(true);
    setCaptureError(null);
    setGenError(null);
    setImageDataUrl("");
    try {
      const res = await bg<{ type: "page.capture"; page: CapturedPage }>({ type: "page.capture" });
      setCaptured(res.page);
      setShowCapturePreview(true);
    } catch (e: any) {
      setCaptured(null);
      setCaptureError(e?.message || "Capture failed");
    } finally {
      setIsCapturing(false);
    }
  }

  async function rebuildPrompt(nextCaptured: CapturedPage | null, nextTemplateId: string) {
    if (!nextCaptured || !nextCaptured.text.trim() || !nextTemplateId) {
      setBuiltPrompt("");
      return;
    }
    const res = await bg<{ type: "prompt.build"; prompt: string }>({
      type: "prompt.build",
      templateId: nextTemplateId,
      page: { title: nextCaptured.title, url: nextCaptured.url, text: nextCaptured.text },
    });
    setBuiltPrompt(res.prompt);
  }

  useEffect(() => {
    rebuildPrompt(captured, selectedTemplateId).catch((e) => console.error(e));
  }, [captured, selectedTemplateId]);

  async function handleGenerate() {
    if (!builtPrompt.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    setImageDataUrl("");
    try {
      const res = await bg<{ type: "image.generate"; imageDataUrl: string }>({
        type: "image.generate",
        prompt: builtPrompt,
        settings,
      });
      setImageDataUrl(res.imageDataUrl);
    } catch (e: any) {
      setGenError(e?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownload() {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = "nano-banana.png";
    a.click();
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-3 py-2 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-sm font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Nano Banana
          </div>
          <div className="text-[11px] text-slate-400">
            {captured ? `Captured ${captured.text.length} chars` : "Capture page text to begin"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="w-9 px-0"
            title="Templates"
            onClick={() => setIsTemplateModalOpen(true)}
            icon={<Bookmark size={16} />}
          />
          <Button
            variant="secondary"
            className="w-9 px-0"
            title="Settings"
            onClick={() => setIsSettingsModalOpen(true)}
            icon={<Settings size={16} />}
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-3 space-y-3">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Capture</div>
            <Button
              variant="secondary"
              onClick={handleCapture}
              isLoading={isCapturing}
              icon={!isCapturing ? <RefreshCcw size={16} /> : undefined}
              className="text-sm"
            >
              Capture page text
            </Button>
          </div>
          {captureError && <div className="text-xs text-red-400">{captureError}</div>}
          {captured && (
            <div className="text-xs text-slate-400">
              <div className="truncate">
                <span className="text-slate-300">Title:</span> {captured.title || "(no title)"}
              </div>
              <div className="truncate">
                <span className="text-slate-300">URL:</span> {captured.url}
              </div>
              <div>
                <span className="text-slate-300">Method:</span> {captured.method}
              </div>
              <button
                className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs"
                onClick={() => setShowCapturePreview((v) => !v)}
              >
                {showCapturePreview ? "Hide" : "Show"} captured text
              </button>
              {showCapturePreview && (
                <textarea
                  className="mt-2 w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={captured.text}
                  onChange={(e) => setCaptured({ ...captured, text: e.target.value })}
                />
              )}
            </div>
          )}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Template</div>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedTemplate && <div className="text-xs text-slate-500 line-clamp-3">{selectedTemplate.content}</div>}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Prompt</div>
          <textarea
            className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            value={builtPrompt}
            onChange={(e) => setBuiltPrompt(e.target.value)}
            placeholder="Capture a page and select a template to build the prompt..."
          />
          <Button
            onClick={handleGenerate}
            disabled={!apiKey.trim() || !builtPrompt.trim() || isGenerating}
            isLoading={isGenerating}
            icon={!isGenerating ? <Send size={16} /> : undefined}
            className="w-full"
          >
            Generate
          </Button>
          {!apiKey.trim() && <div className="text-xs text-amber-400">Set your API key in Settings to generate.</div>}
          {genError && <div className="text-xs text-red-400">{genError}</div>}
        </section>

        {imageDataUrl && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Result</div>
            <img src={imageDataUrl} className="w-full rounded-lg border border-slate-800" />
            <Button onClick={handleDownload} variant="secondary" icon={<Download size={16} />} className="w-full">
              Download
            </Button>
          </section>
        )}
      </main>

      <footer className="shrink-0 border-t border-slate-800 bg-slate-900/40 px-3 py-2">
        <label className="text-[11px] text-slate-400">API key</label>
        <input
          type="password"
          className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your key..."
        />
      </footer>

      <TemplateManager
        templates={templates}
        onAdd={(template) => {
          const next = [...templates, template];
          setTemplates(next);
          bg({ type: "templates.set", templates: next }).catch(() => {});

          // If this is the first template, auto-select it.
          if (!selectedTemplateId) setSelectedTemplateId(template.id);
        }}
        onRemove={(id) => {
          const next = templates.filter((t) => t.id !== id);
          setTemplates(next);
          bg({ type: "templates.set", templates: next }).catch(() => {});

          // If user removed the selected template, select the first remaining one.
          if (id === selectedTemplateId) {
            setSelectedTemplateId(next[0]?.id ?? "");
          }
        }}
        onSelect={(content) => {
          // TemplateManager's built-in "Use Template" is not used in the extension flow;
          // template selection is driven by the dropdown.
          void content;
        }}
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <SettingsModal
        settings={settings}
        onUpdate={(s) => setSettings(s)}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};


