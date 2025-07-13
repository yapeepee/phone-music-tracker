/**
 * Strip markdown formatting from text to create plain text preview
 */
export const stripMarkdown = (markdown: string): string => {
  let text = markdown;
  
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image]');
  
  // Remove video embeds
  text = text.replace(/\[video\]\([^)]+\)/g, '[Video]');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove headers
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  
  // Remove code blocks
  text = text.replace(/```[^`]*```/g, '[Code]');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '');
  
  // Remove horizontal rules
  text = text.replace(/^---+$/gm, '');
  
  // Remove lists
  text = text.replace(/^[\*\-\+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  text = text.trim();
  
  return text;
};