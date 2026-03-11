import { PageContext } from './pageContextService';

const PLACEHOLDER_PATTERN = /\{\{\s*(title|url|pageText)\s*\}\}/g;

const placeholderResolvers: Record<keyof PageContext, (context: PageContext) => string> = {
  title: (context) => context.title,
  url: (context) => context.url,
  pageText: (context) => context.pageText,
};

export const hasTemplatePlaceholders = (prompt: string): boolean =>
  /\{\{\s*(title|url|pageText)\s*\}\}/.test(prompt);

export const resolveTemplatePrompt = (prompt: string, context: PageContext): string =>
  prompt.replace(PLACEHOLDER_PATTERN, (_, key: keyof PageContext) => placeholderResolvers[key](context) || '');
