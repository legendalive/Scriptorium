import { ChapterSegment } from '../types';

/**
 * Heuristic chapter segmentation.
 * Scores paragraph boundaries using scene-shift cues, time/location transitions,
 * paragraph length and dialogue density, or explicit Chapter/Part markers.
 */
export function segmentManuscript(text: string, maxChapters = 6): ChapterSegment[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  // Check if explicit chapter markers exist (e.g. "Chapter 1", "# Chapter", "Part I")
  const explicitChapterRegex = /(?:^|\n)(?:#{1,3}\s+|chapter\s+\d+|part\s+[ivxlcdm\d]+|act\s+[ivxlcdm\d]+)/i;
  
  if (explicitChapterRegex.test(clean)) {
    const rawParts = clean.split(/(?=(?:^|\n)(?:#{1,3}\s+|chapter\s+\d+|part\s+[ivxlcdm\d]+|act\s+[ivxlcdm\d]+))/i);
    const validParts = rawParts.map((p) => p.trim()).filter(Boolean);
    if (validParts.length > 1) {
      return validParts.map((partText, idx) => {
        const firstLine = partText.split('\n')[0].replace(/^#+\s*/, '').trim();
        const wordCount = partText.split(/\s+/).filter(Boolean).length;
        return {
          index: idx + 1,
          title: firstLine.length > 50 ? `Chapter ${idx + 1}` : firstLine || `Chapter ${idx + 1}`,
          text: partText,
          wordCount,
        };
      });
    }
  }

  const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= maxChapters) {
    return paragraphs.map((pText, i) => ({
      index: i + 1,
      title: `Chapter ${i + 1}`,
      text: pText,
      wordCount: pText.split(/\s+/).filter(Boolean).length,
    }));
  }

  const total = paragraphs.length;
  const desired = Math.min(maxChapters, Math.max(1, Math.ceil(total / 6)));
  if (desired <= 1) {
    return [
      {
        index: 1,
        title: 'Chapter 1',
        text: paragraphs.join('\n\n'),
        wordCount: clean.split(/\s+/).filter(Boolean).length,
      },
    ];
  }

  const boundaries: { i: number; score: number }[] = [];
  for (let i = 1; i < total; i++) {
    const p = paragraphs[i];
    const prev = paragraphs[i - 1];
    let score = 0;

    if (
      /^(later|the next|that night|the following|by morning|days later|hours later|meanwhile|elsewhere|at dawn|at dusk|years later|months later|suddenly|back at)\b/i.test(
        p
      )
    ) {
      score += 6;
    }
    if (/^(when|after|before|once|as soon as|by the time|while|eventually)\b/i.test(p)) score += 3;
    if (/^(he|she|they|we|i|the carriage|the ship|the room|the city)\b/i.test(p)) score += 1;
    if (/[.!?]["'”’]?$/.test(prev)) score += 2;
    if (p.length < 240) score += 1;
    if (!p.includes('"') && !prev.includes('"')) score += 1;
    if (/^(chapter|part|book|act|scene)\b/i.test(p)) score += 12;

    boundaries.push({ i, score });
  }

  const cuts: number[] = [];
  for (let c = 1; c < desired; c++) {
    const target = Math.round((total * c) / desired);
    const window = boundaries.filter(
      (b) => Math.abs(b.i - target) <= Math.max(3, Math.floor(total * 0.15))
    );
    window.sort((a, b) => b.score - a.score || Math.abs(a.i - target) - Math.abs(b.i - target));
    const candidate = window[0]?.i;
    if (candidate && !cuts.includes(candidate)) cuts.push(candidate);
  }
  cuts.sort((a, b) => a - b);

  const result: ChapterSegment[] = [];
  let start = 0;
  for (let idx = 0; idx < cuts.length; idx++) {
    const cut = cuts[idx];
    const chParas = paragraphs.slice(start, cut);
    const chText = chParas.join('\n\n');
    result.push({
      index: idx + 1,
      title: `Chapter ${idx + 1}`,
      text: chText,
      wordCount: chText.split(/\s+/).filter(Boolean).length,
    });
    start = cut;
  }

  const finalParas = paragraphs.slice(start);
  const finalText = finalParas.join('\n\n');
  result.push({
    index: cuts.length + 1,
    title: `Chapter ${cuts.length + 1}`,
    text: finalText,
    wordCount: finalText.split(/\s+/).filter(Boolean).length,
  });

  return result.slice(0, maxChapters);
}

