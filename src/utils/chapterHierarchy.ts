/**
 * Utilities for detecting, organizing, and navigating longform chapter & scene hierarchies.
 * Optimized for large-scale manuscripts without thread blocking.
 */

export interface NovelChapterNode {
  id: string;
  index: number;
  title: string;
  charIndex: number;
  wordCount: number;
  preview: string;
}

/**
 * Fast approximation of word count without heavy array allocations.
 */
function fastWordCount(text: string): number {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Non-whitespace character
    if (code > 32) {
      if (!inWord) {
        count++;
        inWord = true;
      }
    } else {
      inWord = false;
    }
  }
  return count;
}

export function parseChaptersFromText(
  text: string | null | undefined,
  defaultPrefix = 'Chapter'
): NovelChapterNode[] {
  if (!text || typeof text !== 'string' || !text.trim()) return [];

  // Simple, safe line-by-line header detection (prevents regex backtracking)
  const lines = text.split('\n');
  const matches: { title: string; charIndex: number }[] = [];
  let currentOffset = 0;

  const headerPattern = /^(?:#+\s*)?(?:Chapter\s+(?:\d+|[IVXLCDM]+|[A-Za-z]+)(?::[^\n]+)?|Prologue|Epilogue|Act\s+[IVXLCDM\d]+|Scene\s+\d+|Part\s+\d+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length > 0 && trimmed.length < 80 && headerPattern.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^[#*\s-]+|[#*\s-]+$/g, '');
      if (cleanTitle) {
        matches.push({
          title: cleanTitle,
          charIndex: currentOffset + line.indexOf(trimmed),
        });
      }
    }
    // Add line length + newline character
    currentOffset += line.length + 1;
  }

  // Fallback: If no headers detected, split logically by size without heavy sub-splits
  if (matches.length === 0) {
    const totalWords = fastWordCount(text);
    const targetChunks = Math.min(12, Math.max(1, Math.ceil(totalWords / 3000)));
    const chunkSizeChar = Math.ceil(text.length / targetChunks);

    const nodes: NovelChapterNode[] = [];
    for (let i = 0; i < targetChunks; i++) {
      const start = i * chunkSizeChar;
      const end = Math.min(text.length, (i + 1) * chunkSizeChar);
      const chunkText = text.substring(start, end);

      nodes.push({
        id: `ch-${i + 1}`,
        index: i + 1,
        title: `${defaultPrefix} ${i + 1}`,
        charIndex: start,
        wordCount: fastWordCount(chunkText),
        preview: chunkText.trim().slice(0, 100),
      });
    }
    return nodes;
  }

  // Build chapter nodes from matches
  const nodes: NovelChapterNode[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextCharIndex = i + 1 < matches.length ? matches[i + 1].charIndex : text.length;
    const chBody = text.substring(current.charIndex, nextCharIndex);

    nodes.push({
      id: `ch-node-${i + 1}`,
      index: i + 1,
      title: current.title,
      charIndex: current.charIndex,
      wordCount: fastWordCount(chBody),
      preview: chBody.trim().slice(0, 100),
    });
  }

  return nodes;
}
