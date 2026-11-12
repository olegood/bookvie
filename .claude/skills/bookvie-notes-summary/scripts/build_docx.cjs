// Build the printable "what I've learned" Word document from summary.json.
//
// Usage: NODE_PATH=<dir>/node_modules node build_docx.cjs <summary.json> <out.docx>
//
// summary.json:
// {
//   "title": "...", "subtitle": "..." | null, "authors": ["..."],
//   "progress": "What I have learned so far (through page 61 of 230)",
//   "purpose": "..." | null,
//   "purposeHeading": "Why I read this",   // optional; defaults to "Why I am reading this"
//   "sections": [{ "heading": "...", "points": [{ "lead": "Bold lead-in.", "text": "Rest of the point." }] }],
//   "takeaway": "..." | null
// }
// A point's "lead" is optional. Page size is A4.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, BorderStyle } = require('docx');

const [src, dest] = process.argv.slice(2);
if (!src || !dest) { console.error('usage: build_docx.cjs <summary.json> <out.docx>'); process.exit(1); }
const s = JSON.parse(fs.readFileSync(src, 'utf8'));

const FONT = 'Georgia';
const ACCENT = '2F5D62';
const para = (runs, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: runs });
const heading = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const point = ({ lead, text }) => {
  const runs = [];
  if (lead) runs.push(new TextRun({ text: lead.trim() + ' ', bold: true }));
  if (text) runs.push(new TextRun(text.trim()));
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 100 }, children: runs });
};

const byline = [s.subtitle, (s.authors || []).join(', ')].filter(Boolean).join(' — ');
const children = [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(s.title)] })];
if (byline) children.push(para([new TextRun({ text: byline, italics: true })]));
children.push(para([new TextRun({ text: s.progress || 'What I have learned', color: '555555' })], {
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 6 } },
  spacing: { after: 240 },
}));
if (s.purpose) children.push(heading(s.purposeHeading || 'Why I am reading this'), para([new TextRun(s.purpose)]));
for (const sec of s.sections || []) {
  children.push(heading(sec.heading));
  for (const p of sec.points || []) children.push(point(p));
}
if (s.takeaway) children.push(heading('Key takeaway'), para([new TextRun(s.takeaway)]));

const doc = new Document({
  creator: 'bookvie',
  title: `${s.title} — summary`,
  styles: {
    default: { document: { run: { font: FONT, size: 23 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: FONT, size: 40, bold: true },
        paragraph: { spacing: { before: 0, after: 60 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 27, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 260, after: 100 }, keepNext: true, outlineLevel: 0 } },
    ],
  },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: 'left',
    style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 },
    margin: { top: 1134, bottom: 1134, left: 1247, right: 1247 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(dest, buf); console.log(dest); });
