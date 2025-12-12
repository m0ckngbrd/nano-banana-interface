export interface HistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  imageUrl?: string;
  status: 'waiting' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  // Cost tracking (optional for future use)
  estimatedCost?: number;
  textTokens?: number;
  imageTokens?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface GenerationSettings {
  aspectRatio: 'Auto' | '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  resolution: '1K' | '2K' | '4K';
  temperature: number;
}

export enum View {
  GENERATOR = 'GENERATOR',
  TEMPLATES = 'TEMPLATES',
  HISTORY = 'HISTORY' // Mobile view mainly
}