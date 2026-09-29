/**
 * Lightweight, format-agnostic text extraction. Designed to run inside a Web Worker.
 * Every extractor returns PLAIN TEXT only. Images/media are never decoded.
 */
import JSZip from 'jszip';

export type ProgressFn = (percent: number, message: string) => void;
export type Extractor = (buffer: ArrayBuffer, report: ProgressFn) => Promise<string>;

const ENTITY_RE = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;
function decodeXmlEntities(s: string): string {
  if (s.indexOf('&') === -1) return s;
  return s.replace(ENTITY_RE, (_m, e: string) => {
    switch (e) {
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      default:
        if (e[0] === '#') {
          const cp = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
          return Number.isFinite(cp) ? String.fromCodePoint(cp) : _m;
        }
        return _m;
    }
  });
}

/** Fast .docx -> plain text. Unzips, reads ONLY word/document.xml. */
export const extractDocxText: Extractor = async (buffer, report) => {
  report(10, 'Opening archive…');
  const zip = await JSZip.loadAsync(buffer);
  report(35, 'Reading document body…');
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('Not a valid .docx (word/document.xml missing).');
  const xml = await entry.async('string');
  report(60, 'Extracting paragraphs…');

  const token = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/?>|<w:br\s*\/?>/g;
  const blocks = xml.split('</w:p>');
  const lines: string[] = new Array(blocks.length);
  for (let i = 0; i < blocks.length; i++) {
    let line = '';
    token.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = token.exec(blocks[i]))) {
      if (m[1] !== undefined) line += decodeXmlEntities(m[1]);
      else if (m[0][2] === 't') line += '\t'; // <w:tab>
      else line += '\n';                     // <w:br>
    }
    lines[i] = line;
  }
  report(85, 'Cleaning text…');
  return lines.join('\n').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n');
};

/** Plain text / markdown: zero-cost decode. */
export const extractPlainText: Extractor = async (buffer, report) => {
  report(50, 'Decoding text…');
  return new TextDecoder('utf-8').decode(buffer);
};

/** Registry: add new formats here later (epub, pdf, ...) without touching the UI. */
export function pickExtractor(fileName: string, mime: string): Extractor | null {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  if (ext === 'docx' || mime.includes('wordprocessingml')) return extractDocxText;
  if (ext === 'txt' || ext === 'md' || ext === 'markdown' || mime.startsWith('text/')) return extractPlainText;
  return null;
}
