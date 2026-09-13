/**
 * Utilities for detecting, organizing, and navigating longform chapter & scene hierarchies.
 */

export interface NovelChapterNode {
  id: string;
  index: number;
  title: string;
  charIndex: number;
  wordCount: number;
  preview: string;
}

export function parseChaptersFromText(text: string, defaultPrefix = 'Chapter'): NovelChapterNode[] {
  if (!text || !text.trim()) return [];

  // Match chapter headings:
  // "Chapter 1", "CHAPTER ONE", "Chapter I: Title", "Prologue", "Epilogue", "Act 1", "# Chapter", or scene breaks "***"
  const chapterRegex = /(?:^|\n\s*\n)(?:#+\s*)?(?:(Chapter\s+(?:\d+|[IVXLCDM]+|[A-Za-z]+)(?::[^\n]+)?|Prologue|Epilogue|Act\s+[IVXLCDM\d]+|Scene\s+\d+|Part\s+\d+|[A-Z\s]{4,}(?:\n|$))|(?:(?:\*\s*){3,}|(?:-\s*){3,}))/gi;

  const matches: { title: string; charIndex: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterRegex.exec(text)) !== null) {
    const rawTitle = match[1] || match[0];
    const cleanTitle = rawTitle.replace(/[#*\n-]/g, '').trim();
    if (cleanTitle.length > 0 && cleanTitle.length < 60) {
      matches.push({
        title: cleanTitle,
        charIndex: match.index + (match[0].indexOf(match[1] || match[0])),
      });
    }
  }

  // If no explicit chapter headings found, but text is large (> 300 words),
  // divide into logical scenes / chapter segments
  if (matches.length === 0) {
    const paragraphs = text.split(/\n\s*\n+/).filter(Boolean);
    if (paragraphs.length <= 4) {
      return [
        {
          id: 'ch-1',
          index: 1,
          title: `${defaultPrefix} 1`,
          charIndex: 0,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          preview: paragraphs[0]?.slice(0, 120) || '',
        },
      ];
    }

    const chunkSize = Math.max(3, Math.ceil(paragraphs.length / 6));
    const result: NovelChapterNode[] = [];
    let curCharIdx = 0;

    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const group = paragraphs.slice(i, i + chunkSize);
      const groupText = group.join('\n\n');
      const chNum = Math.floor(i / chunkSize) + 1;
      result.push({
        id: `ch-${chNum}`,
        index: chNum,
        title: `${defaultPrefix} ${chNum}`,
        charIndex: curCharIdx,
        wordCount: groupText.split(/\s+/).filter(Boolean).length,
        preview: group[0]?.slice(0, 120) || '',
      });
      curCharIdx += groupText.length + 2;
    }
    return result;
  }

  // If headings were found, calculate word count and previews between headings
  const nodes: NovelChapterNode[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextCharIndex = i + 1 < matches.length ? matches[i + 1].charIndex : text.length;
    const chBody = text.substring(current.charIndex, nextCharIndex).trim();
    nodes.push({
      id: `ch-node-${i + 1}`,
      index: i + 1,
      title: current.title,
      charIndex: current.charIndex,
      wordCount: chBody.split(/\s+/).filter(Boolean).length,
      preview: chBody.slice(0, 120),
    });
  }

  return nodes;
}
