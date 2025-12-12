import type { GenerationSettings as AppGenerationSettings, PromptTemplate as AppPromptTemplate } from "../../types";

export type GenerationSettings = AppGenerationSettings;
export type PromptTemplate = AppPromptTemplate;

export interface ExtensionConfig {
  apiKey?: string;
  settings?: GenerationSettings;
  selectedTemplateId?: string;
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: "Auto",
  resolution: "1K",
  temperature: 1.0,
};

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "default_detailed_infographic",
    name: "Detailed, creative infographic",
    content:
      "Create a detailed, creative infographic image that represents the key ideas and learnings from this page:\n\nTitle: {{title}}\nURL: {{url}}\n\n{{pageText}}",
    isDefault: true,
  },
  {
    id: "default_cover_image",
    name: "Hero banner image",
    content:
      "Generate a professional hero banner image suitable for a website header, inspired by the content of this page:\n\nTitle: {{title}}\nURL: {{url}}\n\n{{pageText}}",
  },
  {
    id: "default_illustration",
    name: "Illustration",
    content:
      "Create an illustration that captures the essence of this content:\n\n{{pageText}}",
  },
  {
    id: "default_concept_art",
    name: "Concept art",
    content:
      "Generate concept art based on the ideas and themes described here:\n\n{{pageText}}",
  },
];


