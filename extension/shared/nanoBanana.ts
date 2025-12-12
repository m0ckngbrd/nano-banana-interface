import { GoogleGenAI } from "@google/genai";
import type { GenerationSettings } from "./types";

// Ported from services/geminiService.ts, but with explicit apiKey passed in.
export const MODEL_NAME = "gemini-3-pro-image-preview";

export async function generateImageFromPrompt(
  prompt: string,
  settings: GenerationSettings,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const imageConfig: any = {
    imageSize: settings.resolution,
  };
  if (settings.aspectRatio !== "Auto") {
    imageConfig.aspectRatio = settings.aspectRatio;
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      temperature: settings.temperature,
      imageConfig,
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates returned.");
  }

  const parts = candidates[0].content.parts;
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data found in response.");
}


