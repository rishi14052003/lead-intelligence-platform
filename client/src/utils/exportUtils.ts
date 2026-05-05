import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, HeadingLevel } from 'docx';

export interface Lead {
  id?: string;
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  score?: number;
  company?: string;
  createdAt?: string;
}

/**
 * Generic export to Excel format (.xlsx)
 * @param data - Array of objects to export
 * @param filename - Name of the file to download (without extension)
 * @param sheetName - Name of the sheet in the Excel file
 */
export const exportToExcel = <T extends Record<string, any>>(data: T[], filename: string = 'export', sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate and download file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Generic export to PDF format
 * @param data - Array of objects to export
 * @param filename - Name of the file to download (without extension)
 * @param title - Title for the PDF document
 */
export const exportToPDF = <T extends Record<string, any>>(data: T[], filename: string = 'export', title: string = 'Export') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create PDF document
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

  // Get headers from first object
  const headers = Object.keys(data[0]).map(key => key.charAt(0).toUpperCase() + key.slice(1));
  
  // Prepare table data
  const tableData = data.map(item => 
    Object.values(item).map(val => val?.toString() || '-')
  );

  // Add table to PDF
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [108, 99, 255],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
};

/**
 * Generic export to Word format (.docx)
 * @param data - Array of objects to export
 * @param filename - Name of the file to download (without extension)
 * @param title - Title for the Word document
 */
export const exportToWord = async <T extends Record<string, any>>(data: T[], filename: string = 'export', title: string = 'Export') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const columnWidth = 100 / headers.length;

  // Create table rows
  const tableRows = [
    // Header row
    new TableRow({
      children: headers.map(header => 
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: header.charAt(0).toUpperCase() + header.slice(1), bold: true })] })], 
          width: { size: columnWidth, type: WidthType.PERCENTAGE } 
        })
      ),
    }),
    // Data rows
    ...data.map(item => 
      new TableRow({
        children: headers.map(header => 
          new TableCell({ children: [new Paragraph(item[header]?.toString() || '-')] })
        ),
      })
    ),
  ];

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: `Generated on ${new Date().toLocaleDateString()}`,
            spacing: { after: 400 },
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  // Generate and download file
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.docx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
