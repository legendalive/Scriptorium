/**
 * Utilities for paragraph-by-paragraph and sentence-by-sentence scrolling.
 */

export function getParagraphIndices(text: string): number[] {
  if (!text) return [0];
  const indices: number[] = [0];
  const regex = /\n\s*\n+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const nextIdx = match.index + match[0].length;
    if (nextIdx < text.length && !indices.includes(nextIdx)) {
      indices.push(nextIdx);
    }
  }
  // If text only contains single newlines, treat each line as a boundary
  if (indices.length === 1 && text.includes('\n')) {
    const singleRegex = /\n+/g;
    while ((match = singleRegex.exec(text)) !== null) {
      const nextIdx = match.index + match[0].length;
      if (nextIdx < text.length && !indices.includes(nextIdx)) {
        indices.push(nextIdx);
      }
    }
  }
  return indices.sort((a, b) => a - b);
}

export function getSentenceIndices(text: string): number[] {
  if (!text) return [0];
  const indices: number[] = [0];
  const regex = /([.!?]+['"”’\)]?)\s+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const nextIdx = match.index + match[0].length;
    if (nextIdx < text.length) {
      const before = text.substring(Math.max(0, match.index - 5), match.index + 1);
      if (!/\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|e\.g|i\.e)\.$/i.test(before)) {
        indices.push(nextIdx);
      }
    }
  }
  // Include paragraph boundaries as sentence starts
  const pIndices = getParagraphIndices(text);
  pIndices.forEach((pIdx) => {
    if (!indices.includes(pIdx)) {
      indices.push(pIdx);
    }
  });

  return Array.from(new Set(indices)).sort((a, b) => a - b);
}

export function getCharScrollTop(textarea: HTMLTextAreaElement, charIndex: number): number {
  if (charIndex <= 0) return 0;
  if (charIndex >= textarea.value.length) {
    return Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  }

  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  mirror.style.position = 'fixed';
  mirror.style.top = '-9999px';
  mirror.style.left = '-9999px';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflowWrap = 'break-word';

  const textBefore = textarea.value.substring(0, charIndex);
  const textAfter = textarea.value.substring(charIndex);

  const spanBefore = document.createTextNode(textBefore);
  const targetSpan = document.createElement('span');
  targetSpan.textContent = textAfter.charAt(0) || ' ';
  const spanAfter = document.createTextNode(textAfter.slice(1));

  mirror.appendChild(spanBefore);
  mirror.appendChild(targetSpan);
  mirror.appendChild(spanAfter);

  document.body.appendChild(mirror);
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const targetTop = targetSpan.offsetTop - paddingTop;
  document.body.removeChild(mirror);

  return Math.max(0, targetTop);
}
