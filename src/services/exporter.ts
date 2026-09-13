import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import saveAs from 'file-saver';
import { Project } from '../types';

export async function exportToDocx(project: Project, content: string): Promise<void> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error('Novel content is empty.');
  }

  const lines = cleanContent.replace(/\r\n/g, '\n').split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      children.push(new Paragraph({ spacing: { after: 180 } }));
      continue;
    }

    const headingMatch =
      t.match(/^#{1,3}\s+(.+)$/) ||
      t.match(/^(Chapter\s+\d+(?:\s*[:.-]\s*.*)?)$/i) ||
      t.match(/^(Part\s+[IVXLCDM\d]+(?:\s*[:.-]\s*.*)?)$/i);

    if (headingMatch) {
      const hashes = t.match(/^#+/)?.[0].length || 1;
      const level =
        hashes === 1
          ? HeadingLevel.HEADING_1
          : hashes === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;

      children.push(
        new Paragraph({
          text: headingMatch[1] || headingMatch[0],
          heading: level,
          spacing: { before: 360, after: 180 },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: t, font: 'Georgia', size: 24 })], // 12pt
          spacing: { after: 200, line: 320 },
        })
      );
    }
  }

  const doc = new Document({
    creator: 'Scriptorium',
    title: project.bookName,
    description: `Exported from Scriptorium - ${project.seriesName || ''}`,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (project.bookName || 'Scriptorium_Manuscript')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .trim();

  saveAs(blob, `${safeName}.docx`);
}

export function exportToMarkdown(project: Project, content: string): void {
  const safeName = (project.bookName || 'Scriptorium_Manuscript')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .trim();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${safeName}.md`);
}

export function exportToPlainText(project: Project, content: string): void {
  const safeName = (project.bookName || 'Scriptorium_Manuscript')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .trim();
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${safeName}.txt`);
}
