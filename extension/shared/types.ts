import type { GenerationSettings as AppGenerationSettings, PromptTemplate as AppPromptTemplate } from "../../types";

export type GenerationSettings = AppGenerationSettings;
export type PromptTemplate = AppPromptTemplate;

export interface ExtensionConfig {
  apiKey?: string;
  settings?: GenerationSettings;
  selectedTemplateId?: string;
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: "1:1",
  resolution: "1K",
  temperature: 1.0,
};

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "default_summarize_to_scene",
    name: "Summarize page into a scene",
    content:
      "Create an image prompt from this page. Be concrete, visual, and specific.\n\nTitle: {{title}}\nURL: {{url}}\n\nPage:\n{{pageText}}\n\nImage prompt:",
  },
  {
    id: "default_cover_image",
    name: "Cover image (hero banner)",
    content:
      "You are generating a website hero banner image concept.\n\nTitle: {{title}}\nURL: {{url}}\n\nUse the page text below as context. Return a single detailed image prompt.\n\n{{pageText}}",
  },
];


