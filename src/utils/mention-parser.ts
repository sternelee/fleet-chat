/**
 * Mention Parser
 * Parses text input to extract @ (application) and # (file) mentions
 */

export interface Mention {
  type: 'app' | 'file';
  text: string; // The text after @ or # (e.g., "chrome" for @chrome)
  fullText: string; // The complete mention including @ or # (e.g., "@chrome")
  startIndex: number; // Position in original text
  endIndex: number;
  entity?: any; // Resolved application or file object
}

export interface ParsedInput {
  raw: string; // Original input
  plainText: string; // Text with mentions removed or replaced
  mentions: Mention[]; // All detected mentions
  hasAppMention: boolean;
  hasFileMention: boolean;
}

/**
 * Parse input text to extract mentions
 */
export function parseInput(text: string): ParsedInput {
  const mentions: Mention[] = [];
  
  // Regex to match @mention and #mention
  // Matches @ or # followed by non-whitespace characters
  const mentionRegex = /[@#]([^\s@#]+)/g;
  
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(text)) !== null) {
    const fullText = match[0]; // e.g., "@chrome" or "#file.txt"
    const mentionText = match[1]; // e.g., "chrome" or "file.txt"
    const type = fullText[0] === '@' ? 'app' : 'file';
    
    mentions.push({
      type,
      text: mentionText,
      fullText,
      startIndex: match.index,
      endIndex: match.index + fullText.length,
    });
  }
  
  // Sort mentions by position
  mentions.sort((a, b) => a.startIndex - b.startIndex);
  
  // Create plain text (for now, keep mentions but we could remove them)
  const plainText = text;
  
  return {
    raw: text,
    plainText,
    mentions,
    hasAppMention: mentions.some(m => m.type === 'app'),
    hasFileMention: mentions.some(m => m.type === 'file'),
  };
}

/**
 * Get the current mention being typed at cursor position
 * Returns null if not typing a mention
 */
export function getCurrentMention(text: string, cursorPosition: number): Mention | null {
  // Find if cursor is within or immediately after a mention
  const beforeCursor = text.substring(0, cursorPosition);
  
  // Check if we're typing a mention
  const mentionMatch = beforeCursor.match(/[@#]([^\s@#]*)$/);
  
  if (mentionMatch) {
    const fullText = mentionMatch[0];
    const mentionText = mentionMatch[1];
    const type = fullText[0] === '@' ? 'app' : 'file';
    const startIndex = cursorPosition - fullText.length;
    
    return {
      type,
      text: mentionText,
      fullText,
      startIndex,
      endIndex: cursorPosition,
    };
  }
  
  return null;
}

/**
 * Replace a mention in text with a resolved entity name
 */
export function replaceMention(
  text: string,
  mention: Mention,
  newText: string
): string {
  return (
    text.substring(0, mention.startIndex) +
    newText +
    text.substring(mention.endIndex)
  );
}

/**
 * Format mentions for display with highlighting
 */
export function formatMentionsForDisplay(text: string): Array<{
  type: 'text' | 'app-mention' | 'file-mention';
  content: string;
}> {
  const parsed = parseInput(text);
  const segments: Array<{
    type: 'text' | 'app-mention' | 'file-mention';
    content: string;
  }> = [];
  
  let lastIndex = 0;
  
  for (const mention of parsed.mentions) {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, mention.startIndex),
      });
    }
    
    // Add mention
    segments.push({
      type: mention.type === 'app' ? 'app-mention' : 'file-mention',
      content: mention.fullText,
    });
    
    lastIndex = mention.endIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }
  
  return segments;
}
