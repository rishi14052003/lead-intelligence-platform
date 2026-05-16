import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, TextRun, BorderStyle, ShadingType, VerticalAlign,
  AlignmentType, HeadingLevel,
} from 'docx';

export interface Lead {
  id?: string;
  name: string;
  role: string;
  matchedCategory?: string;
  email?: string;
  linkedin?: string;
  score?: number;
  company?: string;
  companyUrl?: string;
  createdAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeName(name: string | undefined): string {
  if (!name) return 'Unknown';
  if (name.includes('function') || name.includes('=>') || name.includes('return') || name.length > 100)
    return 'Unknown';
  return name;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Excel (unchanged) ────────────────────────────────────────────────────────

export const exportToExcel = (
  data: Lead[],
  filename: string = 'export',
  sheetName: string = 'Sheet1'
) => {
  if (!data || data.length === 0) { alert('No data to export'); return; }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

export const exportToPDF = (
  data: Lead[],
  filename: string = 'export'
) => {
  if (!data || data.length === 0) { alert('No data to export'); return; }

  const leads = data;
  const date = formatDate();
  const withEmail = leads.filter(l => l.email).length;
  const withLinkedIn = leads.filter(l => l.linkedin).length;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Dark header banner ──
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Lead Report', 14, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${date}`, 14, 21);
  doc.text(filename, pageW - 14, 21, { align: 'right' });

  // ── Stat pills ──
  const stats = [
    { label: 'Total Leads',    value: String(leads.length) },
    { label: 'With Email',     value: String(withEmail) },
    { label: 'With LinkedIn',  value: String(withLinkedIn) },
    { label: 'Email Coverage', value: `${Math.round((withEmail / leads.length) * 100) || 0}%` },
  ];

  const pillW = 42;
  const pillGap = 6;
  const pillY = 32;
  stats.forEach((s, i) => {
    const x = 14 + i * (pillW + pillGap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, pillY, pillW, 16, 2, 2, 'F');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(s.value, x + pillW / 2, pillY + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(s.label.toUpperCase(), x + pillW / 2, pillY + 13, { align: 'center' });
  });

  // ── Table ──
  const tableData = leads.map(l => [
    sanitizeName(l.name),
    l.role || '—',
    l.company || '—',
    l.email || '—',
    l.linkedin ? l.linkedin.replace('https://www.linkedin.com/in/', 'in/') : '—',
  ]);

  autoTable(doc, {
    head: [['Name', 'Job Title', 'Company', 'Email', 'LinkedIn']],
    body: tableData,
    startY: 54,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      textColor: [51, 65, 85],
      font: 'helvetica',
      lineColor: [241, 245, 249],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 48 },
      1: { cellWidth: 48 },
      2: { cellWidth: 44 },
      3: { textColor: [37, 99, 235],  cellWidth: 68 },
      4: { textColor: [124, 58, 237], cellWidth: 60 },
    },
    didDrawPage: (hookData) => {
      const jspdfDoc = doc as jsPDF & { internal: { getNumberOfPages: () => number } };
      const pageCount = jspdfDoc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageH - 8, pageW - 14, pageH - 8);
      doc.text('Lead Finder — Confidential', 14, pageH - 4);
      doc.text(
        `Page ${hookData.pageNumber} of ${pageCount}  ·  ${leads.length} records exported`,
        pageW - 14, pageH - 4, { align: 'right' }
      );
    },
  });

  doc.save(`${filename}.pdf`);
};

// ─── Word ─────────────────────────────────────────────────────────────────────

export const exportToWord = async (
  data: Lead[],
  filename: string = 'export'
) => {
  if (!data || data.length === 0) { alert('No data to export'); return; }

  const leads = data;
  const date = formatDate();
  const withEmail = leads.filter(l => l.email).length;
  const withLinkedIn = leads.filter(l => l.linkedin).length;

  // ── Border style ──
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
  const borders = { top: border, bottom: border, left: border, right: border };

  // ── Column widths in DXA (landscape A4 with ~0.75" margins ≈ 13680 total) ──
  const colWidths = [2736, 2736, 2280, 3192, 2736]; // sums to 13680
  const colLabels = ['Name', 'Job Title', 'Company', 'Email', 'LinkedIn'];

  function headerCell(text: string, width: number): TableCell {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      shading: { fill: '0F172A', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: text.toUpperCase(), bold: true, color: 'FFFFFF', size: 16, font: 'Arial' })],
      })],
    });
  }

  function dataCell(
    text: string, width: number, isAlt: boolean,
    opts?: { bold?: boolean; color?: string }
  ): TableCell {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      shading: { fill: isAlt ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({
          text: text || '—',
          font: 'Arial',
          size: 18,
          bold: opts?.bold ?? false,
          color: opts?.color ?? '334155',
        })],
      })],
    });
  }

  function statLine(label: string, value: string): Paragraph {
    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `${label}:  `, font: 'Arial', size: 18, color: '64748B' }),
        new TextRun({ text: value, font: 'Arial', size: 18, bold: true, color: '0F172A' }),
      ],
    });
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: colWidths.map((w, i) => headerCell(colLabels[i], w)),
  });

  const dataRows = leads.map((l, i) =>
    new TableRow({
      children: [
        dataCell(sanitizeName(l.name), colWidths[0], i % 2 !== 0, { bold: true, color: '0F172A' }),
        dataCell(l.role || '', colWidths[1], i % 2 !== 0),
        dataCell(l.company || '', colWidths[2], i % 2 !== 0),
        dataCell(l.email || '', colWidths[3], i % 2 !== 0, { color: '2563EB' }),
        dataCell(l.linkedin?.replace('https://www.linkedin.com/in/', 'in/') || '', colWidths[4], i % 2 !== 0, { color: '7C3AED' }),
      ],
    })
  );

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 18 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 40, bold: true, font: 'Arial', color: '0F172A' },
          paragraph: { spacing: { before: 0, after: 160 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 22, bold: true, font: 'Arial', color: '0F172A' },
          paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 16838, height: 11906 }, // A4 landscape in DXA
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Lead Report', font: 'Arial', size: 40, bold: true, color: '0F172A' })],
        }),
        new Paragraph({
          spacing: { after: 320 },
          children: [new TextRun({ text: `Generated on ${date}  ·  ${filename}`, font: 'Arial', size: 16, color: '94A3B8' })],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Summary', font: 'Arial', size: 22, bold: true, color: '0F172A' })],
        }),
        statLine('Total leads', String(leads.length)),
        statLine('With email', `${withEmail} (${Math.round((withEmail / leads.length) * 100) || 0}%)`),
        statLine('With LinkedIn', `${withLinkedIn} (${Math.round((withLinkedIn / leads.length) * 100) || 0}%)`),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Leads', font: 'Arial', size: 22, bold: true, color: '0F172A' })],
        }),
        new Table({
          width: { size: 13680, type: WidthType.DXA },
          columnWidths: colWidths,
          rows: [headerRow, ...dataRows],
        }),

        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 280 },
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0', space: 8 } },
          children: [new TextRun({
            text: `Lead Finder  ·  Confidential  ·  ${leads.length} record${leads.length !== 1 ? 's' : ''} exported`,
            font: 'Arial', size: 14, color: '94A3B8',
          })],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.docx`;
  link.click();
  window.URL.revokeObjectURL(url);
};