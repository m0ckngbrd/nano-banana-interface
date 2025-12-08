import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "../types";

// The model mapping for 'Gemini Nano Banana Pro' or 'gemini pro image' is 'gemini-3-pro-image-preview'
export const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateImageFromPrompt = async (prompt: string, settings: GenerationSettings): Promise<string> => {
  // CRITICAL: Always create a new instance to pick up the latest selected API Key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const imageConfig: any = {
      imageSize: settings.resolution, // 1K, 2K, 4K available for this model
    };

    // Only add aspect ratio if it's not Auto
    if (settings.aspectRatio !== 'Auto') {
      imageConfig.aspectRatio = settings.aspectRatio;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        temperature: settings.temperature,
        imageConfig,
      },
    });

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini.");
    }

    const parts = candidates[0].content.parts;
    let base64Image: string | undefined;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        // Construct the data URL
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${base64Image}`;
      }
    }

    throw new Error("No image data found in response.");

  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    // Check for the specific error regarding API key selection or missing entity
    if (error.message && error.message.includes("Requested entity was not found")) {
        throw new Error("API_KEY_ERROR");
    }
    throw error;
  }
};