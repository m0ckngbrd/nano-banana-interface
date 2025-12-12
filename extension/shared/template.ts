function ensureIncludesPageText(template: string): string {
  return template.includes("{{pageText}}") ? template : `${template}\n\n{{pageText}}`;
}

export function applyTemplate(
  templateContent: string,
  page: { title: string; url: string; text: string }
): string {
  const tpl = ensureIncludesPageText(templateContent);
  return tpl
    .replaceAll("{{title}}", page.title ?? "")
    .replaceAll("{{url}}", page.url ?? "")
    .replaceAll("{{pageText}}", page.text ?? "");
}


