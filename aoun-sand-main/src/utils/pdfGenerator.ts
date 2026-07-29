import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Formats a date string or Date object into a clean DD/MM/YYYY format.
 * This avoids locale inconsistencies and ensures uniform display.
 */
export const formatPDFDate = (dateInput: string | Date): string => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

async function addArabicFont(doc: jsPDF) {
  try {
    const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf';
    const response = await fetch(fontUrl);
    if (!response.ok) return false;
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    doc.addFileToVFS('Amiri-Regular.ttf', base64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    return true;
  } catch (error) {
    console.error('Failed to load Arabic font', error);
    return false;
  }
}

export interface PDFStat {
  label: string;
  value: string | number;
  subLabel?: string;
}

interface GeneratePDFOptions {
  title: string;
  dateRange?: string;
  stats: PDFStat[];
  columns: string[];
  data: any[][];
  fileName: string;
  logoUrl?: string;
  totalsRow?: any[]; // The row to show at the bottom with a different color
}

export const generateFinancialPDF = async ({ 
  title, 
  dateRange,
  stats, 
  columns, 
  data, 
  fileName, 
  logoUrl,
  totalsRow 
}: GeneratePDFOptions) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await addArabicFont(doc);
  doc.setFont('Amiri');

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const darkBlue = '#222659';
  const lightBg = '#f8f9fa';
  const pinkish = '#fca5a5';
  
  // --- HEADER ---
  // Draw top curved/block background
  doc.setFillColor(darkBlue);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // A subtle decorative curve/shape at the bottom of the header
  doc.setFillColor('#2e336b');
  doc.ellipse(pageWidth / 2, 45, pageWidth / 1.5, 10, 'F');

  // Load and Add Logo
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.startsWith('image/')) {
          const reader = new FileReader();
          const base64data = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          doc.addImage(base64data, 'PNG', 15, 8, 20, 20);
        }
      }
    } catch (e) {
      console.error('Logo failed to load', e);
    }
  }

  // Association Name (Top Left, under logo)
  doc.setTextColor('#ffffff');
  doc.setFontSize(12);
  doc.text('جمعية عون وسند الخيرية', 25, 35, { align: 'center' });

  // Report Title (Top Right)
  doc.setFontSize(22);
  doc.text(title, pageWidth - 15, 20, { align: 'right' });
  
  // Subtitle / Association Name
  doc.setFontSize(14);
  doc.setTextColor('#cbd5e1'); // Slate 300
  doc.text('جمعية عون وسند الخيرية', pageWidth - 15, 28, { align: 'right' });

  // Date Range Badge
  if (dateRange) {
    const textWidth = doc.getTextWidth(dateRange);
    doc.setFillColor('#f87171'); // Red 400 badge
    doc.roundedRect(pageWidth - 15 - textWidth - 8, 32, textWidth + 8, 8, 4, 4, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(10);
    doc.text(dateRange, pageWidth - 19, 37.5, { align: 'right' });
  }

  let startY = 65;

  // --- STATS CARDS ---
  if (stats && stats.length > 0) {
    const cardWidth = (pageWidth - 30 - ((stats.length - 1) * 5)) / stats.length;
    const cardHeight = 25;
    
    // Draw cards from right to left (RTL)
    stats.forEach((stat, index) => {
      // Calculate X position from right
      const xPos = pageWidth - 15 - (index * (cardWidth + 5)) - cardWidth;
      
      // Card background
      doc.setFillColor('#f8fafc'); // Slate 50
      doc.setDrawColor('#e2e8f0'); // Slate 200
      doc.roundedRect(xPos, startY, cardWidth, cardHeight, 3, 3, 'FD');
      
      // Label
      doc.setFontSize(10);
      doc.setTextColor('#64748b'); // Slate 500
      doc.text(stat.label, xPos + cardWidth / 2, startY + 8, { align: 'center' });
      
      // Value
      doc.setFontSize(14);
      doc.setTextColor(darkBlue);
      doc.text(String(stat.value), xPos + cardWidth / 2, startY + 16, { align: 'center' });
      
      // SubLabel
      if (stat.subLabel) {
        doc.setFontSize(8);
        doc.setTextColor('#94a3b8'); // Slate 400
        doc.text(stat.subLabel, xPos + cardWidth / 2, startY + 22, { align: 'center' });
      }
    });
    
    startY += cardHeight + 10;
  }

  // --- TABLE ---
  autoTable(doc, {
    startY,
    head: [columns],
    body: data,
    foot: totalsRow ? [totalsRow] : undefined,
    styles: {
      font: 'Amiri',
      halign: 'center',
      valign: 'middle',
      fontSize: 10,
      textColor: '#334155',
      lineColor: '#e2e8f0',
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: darkBlue,
      textColor: '#ffffff',
      fontStyle: 'normal',
    },
    footStyles: {
      fillColor: '#fca5a5', // Red/Pink total row
      textColor: '#ffffff',
      fontStyle: 'normal',
    },
    alternateRowStyles: {
      fillColor: '#f8fafc',
    },
    margin: { top: 60, left: 15, right: 15, bottom: 40 },
    theme: 'grid',
    didDrawPage: (data) => {
      const isFirstPage = data.pageNumber === 1;
      
      // --- FOOTER ---
      const footerY = pageHeight - 35;
      
      // Notes & Signatures (only on last page or all pages? Usually last page, but we can put it on all)
      doc.setFontSize(10);
      doc.setTextColor('#475569');
      
      // Stamp circle placeholder
      doc.setDrawColor(darkBlue);
      doc.setLineWidth(0.5);
      doc.circle(35, footerY - 5, 12, 'S');
      doc.setFontSize(8);
      doc.text('ختم الجمعية', 35, footerY - 5, { align: 'center' });
      
      // Signature line
      doc.setFontSize(11);
      doc.text('مدير الجمعية', pageWidth / 2, footerY - 12, { align: 'center' });
      doc.setDrawColor('#cbd5e1');
      doc.line(pageWidth / 2 - 20, footerY - 2, pageWidth / 2 + 20, footerY - 2);
      
      // Notes lines
      doc.setFontSize(11);
      doc.text('ملاحظات', pageWidth - 25, footerY - 12, { align: 'right' });
      doc.line(pageWidth - 70, footerY - 7, pageWidth - 15, footerY - 7);
      doc.line(pageWidth - 70, footerY - 2, pageWidth - 15, footerY - 2);

      // Bottom Bar
      doc.setFillColor(darkBlue);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      
      doc.setTextColor('#ffffff');
      doc.setFontSize(9);
      
      // Registration number - Left
      doc.text('32203250 :رقم الجمعية', 15, pageHeight - 6, { align: 'left' });
      
      // Email - Center
      doc.text('associationaidesoutien@gmail.com', pageWidth / 2, pageHeight - 6, { align: 'center' });
      
      // Location - Right
      doc.text('موريتانيا', pageWidth - 15, pageHeight - 6, { align: 'right' });
      
      // Page number above footer bar
      doc.setFontSize(8);
      doc.text(`صفحة ${data.pageNumber}`, pageWidth / 2, pageHeight - 11, { align: 'center' });
    },
  });

  doc.save(fileName);
};

export interface MonthlyReportTable {
  title: string;
  columns: string[];
  data: any[][];
  totalsRow: any[];
}

interface GenerateMonthlyPDFOptions {
  title: string;
  dateRange?: string;
  stats: PDFStat[];
  tables: MonthlyReportTable[];
  fileName: string;
  logoUrl?: string;
}

export const generateMonthlyReportPDF = async ({
  title,
  dateRange,
  stats,
  tables,
  fileName,
  logoUrl
}: GenerateMonthlyPDFOptions) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await addArabicFont(doc);
  doc.setFont('Amiri');

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const darkBlue = '#222659';

  // --- HEADER ---
  doc.setFillColor(darkBlue);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setFillColor('#2e336b');
  doc.ellipse(pageWidth / 2, 45, pageWidth / 1.5, 10, 'F');

  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.startsWith('image/')) {
          const reader = new FileReader();
          const base64data = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          doc.addImage(base64data, 'PNG', 15, 8, 20, 20);
        }
      }
    } catch (e) {
      console.error('Logo failed to load', e);
    }
  }

  doc.setTextColor('#ffffff');
  doc.setFontSize(12);
  doc.text('جمعية عون وسند الخيرية', 25, 35, { align: 'center' });
  doc.setFontSize(22);
  doc.text(title, pageWidth - 15, 20, { align: 'right' });
  doc.setFontSize(14);
  doc.setTextColor('#cbd5e1');
  doc.text('جمعية عون وسند الخيرية', pageWidth - 15, 28, { align: 'right' });

  if (dateRange) {
    const textWidth = doc.getTextWidth(dateRange);
    doc.setFillColor('#f87171');
    doc.roundedRect(pageWidth - 15 - textWidth - 8, 32, textWidth + 8, 8, 4, 4, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(10);
    doc.text(dateRange, pageWidth - 19, 37.5, { align: 'right' });
  }

  let startY = 65;

  // --- STATS CARDS ---
  if (stats && stats.length > 0) {
    const cardWidth = (pageWidth - 30 - ((stats.length - 1) * 5)) / stats.length;
    const cardHeight = 25;
    
    stats.forEach((stat, index) => {
      const xPos = pageWidth - 15 - (index * (cardWidth + 5)) - cardWidth;
      doc.setFillColor('#f8fafc');
      doc.setDrawColor('#e2e8f0');
      doc.roundedRect(xPos, startY, cardWidth, cardHeight, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor('#64748b');
      doc.text(stat.label, xPos + cardWidth / 2, startY + 8, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(darkBlue);
      doc.text(String(stat.value), xPos + cardWidth / 2, startY + 16, { align: 'center' });
      
      if (stat.subLabel) {
        doc.setFontSize(8);
        doc.setTextColor('#94a3b8');
        doc.text(stat.subLabel, xPos + cardWidth / 2, startY + 22, { align: 'center' });
      }
    });
    
    startY += cardHeight + 15;
  }

  const drawFooter = (data: any) => {
    const footerY = pageHeight - 35;
    doc.setFontSize(10);
    doc.setTextColor('#475569');
    doc.setDrawColor(darkBlue);
    doc.setLineWidth(0.5);
    doc.circle(35, footerY - 5, 12, 'S');
    doc.setFontSize(8);
    doc.text('ختم الجمعية', 35, footerY - 5, { align: 'center' });
    doc.setFontSize(11);
    doc.text('مدير الجمعية', pageWidth / 2, footerY - 12, { align: 'center' });
    doc.setDrawColor('#cbd5e1');
    doc.line(pageWidth / 2 - 20, footerY - 2, pageWidth / 2 + 20, footerY - 2);
    doc.setFontSize(11);
    doc.text('ملاحظات', pageWidth - 25, footerY - 12, { align: 'right' });
    doc.line(pageWidth - 70, footerY - 7, pageWidth - 15, footerY - 7);
    doc.line(pageWidth - 70, footerY - 2, pageWidth - 15, footerY - 2);

    doc.setFillColor(darkBlue);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(9);
    doc.text('32203250 :رقم الجمعية', 15, pageHeight - 6, { align: 'left' });
    doc.text('associationaidesoutien@gmail.com', pageWidth / 2, pageHeight - 6, { align: 'center' });
    doc.text('موريتانيا', pageWidth - 15, pageHeight - 6, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`صفحة ${data.pageNumber}`, pageWidth / 2, pageHeight - 11, { align: 'center' });
  };

  // --- TABLES ---
  for (const table of tables) {
    // Before drawing a table, let's print its title
    // check if there's enough space for title and header, otherwise new page
    if (startY > pageHeight - 60) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(darkBlue);
    doc.text(table.title, pageWidth - 15, startY, { align: 'right' });
    startY += 5;

    autoTable(doc, {
      startY,
      head: [table.columns],
      body: table.data,
      foot: table.totalsRow ? [table.totalsRow] : undefined,
      styles: {
        font: 'Amiri',
        halign: 'center',
        valign: 'middle',
        fontSize: 10,
        textColor: '#334155',
        lineColor: '#e2e8f0',
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: darkBlue,
        textColor: '#ffffff',
        fontStyle: 'normal',
      },
      footStyles: {
        fillColor: '#fca5a5',
        textColor: '#ffffff',
        fontStyle: 'normal',
      },
      alternateRowStyles: {
        fillColor: '#f8fafc',
      },
      margin: { top: 20, left: 15, right: 15, bottom: 40 },
      theme: 'grid',
      didDrawPage: drawFooter,
    });

    startY = (doc as any).lastAutoTable.finalY + 15;
  }

  doc.save(fileName);
};
