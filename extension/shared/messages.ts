import { captureActiveTabText } from "./pageCapture";
import { generateImageFromPrompt } from "./nanoBanana";
import { getConfig, setConfig, getTemplates, setTemplates } from "./storage";
import { applyTemplate } from "./template";
import { DEFAULT_SETTINGS, type ExtensionConfig, type GenerationSettings, type PromptTemplate } from "./types";

export type BgRequest =
  | { type: "config.get" }
  | { type: "config.set"; config: Partial<ExtensionConfig> }
  | { type: "templates.get" }
  | { type: "templates.set"; templates: PromptTemplate[] }
  | { type: "page.capture"; tabId?: number }
  | {
      type: "prompt.build";
      templateId: string;
      page: { title: string; url: string; text: string };
    }
  | {
      type: "image.generate";
      prompt: string;
      settings?: GenerationSettings;
    };

export type BgResponse =
  | { type: "config.get"; config: ExtensionConfig }
  | { type: "templates.get"; templates: PromptTemplate[] }
  | { type: "page.capture"; page: { title: string; url: string; text: string; method: string } }
  | { type: "prompt.build"; prompt: string }
  | { type: "image.generate"; imageDataUrl: string };

export async function handleMessage(message: unknown, _sender: chrome.runtime.MessageSender): Promise<BgResponse> {
  const msg = message as BgRequest;

  switch (msg?.type) {
    case "config.get": {
      const config = await getConfig();
      return { type: "config.get", config };
    }
    case "config.set": {
      await setConfig(msg.config);
      const config = await getConfig();
      return { type: "config.get", config };
    }
    case "templates.get": {
      const templates = await getTemplates();
      return { type: "templates.get", templates };
    }
    case "templates.set": {
      await setTemplates(msg.templates);
      const templates = await getTemplates();
      return { type: "templates.get", templates };
    }
    case "page.capture": {
      const page = await captureActiveTabText(msg.tabId);
      return { type: "page.capture", page };
    }
    case "prompt.build": {
      const templates = await getTemplates();
      const tpl = templates.find((t) => t.id === msg.templateId);
      if (!tpl) throw new Error("Template not found");
      const prompt = applyTemplate(tpl.content, msg.page);
      return { type: "prompt.build", prompt };
    }
    case "image.generate": {
      const config = await getConfig();
      if (!config.apiKey) throw new Error("Missing API key");
      const settings = msg.settings ?? config.settings ?? DEFAULT_SETTINGS;
      const imageDataUrl = await generateImageFromPrompt(msg.prompt, settings, config.apiKey);
      return { type: "image.generate", imageDataUrl };
    }
    default:
      throw new Error("Unknown message type");
  }
}


