import { parseChaptersFromText, NovelChapterNode } from '../utils/chapterHierarchy';

export interface ParseWorkerInput {
  text: string;
  prefix: string;
  target: 'novel' | 'manuscript';
}

export interface ParseWorkerOutput {
  nodes: NovelChapterNode[];
  target: 'novel' | 'manuscript';
}

self.onmessage = (e: MessageEvent<ParseWorkerInput>) => {
  const { text, prefix, target } = e.data;
  const nodes = parseChaptersFromText(text, prefix);
  
  const response: ParseWorkerOutput = { nodes, target };
  self.postMessage(response);
};
