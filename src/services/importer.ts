import mammoth from 'mammoth';

export interface ManuscriptImportResult {
  fileName: string;
  text: string;
  wordCount: number;
}

/**
 * Parses uploaded manuscript file (.docx, .txt, .md, .rtf) into clean plain text
 */
export async function parseManuscriptFile(file: File): Promise<ManuscriptImportResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  let text = '';

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value || '';
  } else {
    // Plain text, markdown, rtf, or unknown text file
    text = await file.text();
  }

  // Normalize line breaks
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return {
    fileName,
    text,
    wordCount: words,
  };
}
