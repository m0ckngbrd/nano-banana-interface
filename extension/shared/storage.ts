import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, type ExtensionConfig, type PromptTemplate } from "./types";

const CONFIG_KEY = "nanoBanana.config";
const TEMPLATES_KEY = "nanoBanana.templates";

function storageArea() {
  // Prefer sync for portability; fall back to local if sync isn't available.
  return chrome.storage?.sync ?? chrome.storage.local;
}

export async function getConfig(): Promise<ExtensionConfig> {
  const area = storageArea();
  const res = await area.get(CONFIG_KEY);
  const config = (res?.[CONFIG_KEY] as ExtensionConfig | undefined) ?? {};
  return {
    settings: config.settings ?? DEFAULT_SETTINGS,
    ...config,
  };
}

export async function setConfig(patch: Partial<ExtensionConfig>): Promise<void> {
  const area = storageArea();
  const prev = await getConfig();
  const next: ExtensionConfig = { ...prev, ...patch };
  await area.set({ [CONFIG_KEY]: next });
}

export async function getTemplates(): Promise<PromptTemplate[]> {
  const area = storageArea();
  const res = await area.get(TEMPLATES_KEY);
  const templates = res?.[TEMPLATES_KEY] as PromptTemplate[] | undefined;
  if (templates && Array.isArray(templates) && templates.length > 0) return templates;

  await area.set({ [TEMPLATES_KEY]: DEFAULT_TEMPLATES });
  return DEFAULT_TEMPLATES;
}

export async function setTemplates(templates: PromptTemplate[]): Promise<void> {
  const area = storageArea();
  await area.set({ [TEMPLATES_KEY]: templates });
}


