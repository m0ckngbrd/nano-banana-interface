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
    name: "Visualize page content",
    content:
      "Create a detailed, visually striking image that represents the key themes and content from this page:\n\nTitle: {{title}}\nURL: {{url}}\n\n{{pageText}}",
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


