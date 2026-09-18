import { Customer, Delivery } from '../db/db';
import { formatDisplayDate, getTodayStr } from './dateUtils';
import jsPDF from 'jspdf';

interface BillStats {
  totalMilk: number;
  totalAmount: number;
  totalPaid: number;
  remaining: number;
}

// Helper to get formatted month name
export function getFormattedMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const name = monthNames[parseInt(m, 10) - 1] || monthStr;
  return `${name} ${y}`;
}

// Generate high-resolution Canvas representation of the Bill
export function createBillCanvas(
  customer: Customer,
  month: string,
  deliveries: Delivery[],
  stats: BillStats
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context');

  const width = 800;
  // Dynamic height calculation based on row count
  const baseHeight = 520;
  const rowHeight = 32;
  const tableHeight = (deliveries.length + 1) * rowHeight;
  const height = Math.max(900, baseHeight + tableHeight + 100);

  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Header Banner
  ctx.fillStyle = '#0B132B';
  ctx.fillRect(20, 20, width - 40, 90);

  // Brand Tag
  ctx.fillStyle = '#00A2ED';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MILK MANAGER • दूध डायरी', width / 2, 48);

  // Main Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText('मासिक दूध बिल (MONTHLY MILK BILL)', width / 2, 78);

  // Month & Date subheader
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  const todayStr = getTodayStr();
  ctx.fillText(`महीना: ${getFormattedMonth(month)}  |  बिल तारीख: ${formatDisplayDate(todayStr)}`, width / 2, 98);

  // Customer Information Box
  const custBoxY = 125;
  const custBoxHeight = 110;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(25, custBoxY, width - 50, custBoxHeight);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(25, custBoxY, width - 50, custBoxHeight);

  // Customer Name (Prominent & Clear in Devanagari / Hindi)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText('ग्राहक का नाम (CUSTOMER NAME):', 40, custBoxY + 30);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText(customer.name, 40, custBoxY + 62);

  // Shift and Rate Details
  ctx.fillStyle = '#334155';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  const sessionText = customer.session === 'Evening' ? 'शाम (Evening)' : 'सुबह (Morning)';
  ctx.fillText(`रोज़ाना दूध: ${customer.defaultQuantity} L   |   भाव: ₹${customer.rate}/L   |   समय: ${sessionText}`, 40, custBoxY + 92);

  // Summary Metrics (4 Cards)
  const metricsY = custBoxY + custBoxHeight + 15;
  const cardWidth = (width - 50 - 30) / 4;
  const cardHeight = 70;

  // 1. Total Milk
  drawMetricCard(ctx, 25, metricsY, cardWidth, cardHeight, '#E0F2FE', '#0369A1', 'कुल दूध (Milk)', `${stats.totalMilk} L`);
  // 2. Total Amount
  drawMetricCard(ctx, 25 + cardWidth + 10, metricsY, cardWidth, cardHeight, '#F1F5F9', '#1E293B', 'कुल रकम (Total)', `₹${stats.totalAmount}`);
  // 3. Paid
  drawMetricCard(ctx, 25 + (cardWidth + 10) * 2, metricsY, cardWidth, cardHeight, '#DCFCE7', '#15803D', 'जमा (Paid)', `₹${stats.totalPaid}`);
  // 4. Remaining
  drawMetricCard(ctx, 25 + (cardWidth + 10) * 3, metricsY, cardWidth, cardHeight, '#FFE4E6', '#BE123C', 'बाकी (Remaining)', `₹${stats.remaining}`);

  // Table of Daily Deliveries
  const tableY = metricsY + cardHeight + 20;
  
  // Table Header
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(25, tableY, width - 50, 32);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('#', 35, tableY + 21);
  ctx.fillText('तारीख (Date)', 75, tableY + 21);
  ctx.textAlign = 'center';
  ctx.fillText('मात्रा (Qty)', 300, tableY + 21);
  ctx.fillText('दर (Rate)', 430, tableY + 21);
  ctx.textAlign = 'right';
  ctx.fillText('रुपये (Amount)', 580, tableY + 21);
  ctx.textAlign = 'left';
  ctx.fillText('विवरण / Status', 620, tableY + 21);

  // Table Rows
  let currentY = tableY + 32;
  const sortedDeliveries = [...deliveries].sort((a, b) => a.date.localeCompare(b.date));

  sortedDeliveries.forEach((d, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(25, currentY, width - 50, rowHeight);

    // Row border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(25, currentY, width - 50, rowHeight);

    const isSkipped = d.status === 'Skipped';

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.fillText(String(idx + 1), 35, currentY + 20);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
    ctx.fillText(formatDisplayDate(d.date), 75, currentY + 20);

    ctx.textAlign = 'center';
    if (isSkipped) {
      ctx.fillStyle = '#EF4444';
      ctx.fillText('0 L (Skipped)', 300, currentY + 20);
    } else {
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`${d.quantity} L`, 300, currentY + 20);
    }

    ctx.fillStyle = '#64748B';
    ctx.fillText(`₹${d.rate}`, 430, currentY + 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = isSkipped ? '#94A3B8' : '#0F172A';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
    ctx.fillText(`₹${d.amount}`, 580, currentY + 20);

    ctx.textAlign = 'left';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
    ctx.fillStyle = isSkipped ? '#EF4444' : '#10B981';
    ctx.fillText(isSkipped ? 'बंद (No Milk)' : 'सामान्य (Normal)', 620, currentY + 20);

    currentY += rowHeight;
  });

  // Table Total Row
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(25, currentY, width - 50, 36);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(25, currentY, width - 50, 36);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('कुल योग (Total)', 75, currentY + 23);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0369A1';
  ctx.fillText(`${stats.totalMilk} L`, 300, currentY + 23);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`₹${stats.totalAmount}`, 580, currentY + 23);

  // Footer Note
  currentY += 50;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText('धन्यवाद! (Thank You for your business)', width / 2, currentY);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText('Milk Manager App द्वारा तैयार किया गया हिसाब', width / 2, currentY + 20);

  return canvas;
}

function drawMetricCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bgColor: string,
  textColor: string,
  label: string,
  value: string
) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText(label, x + w / 2, y + 25);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.fillText(value, x + w / 2, y + 52);
}

// Download Canvas directly as PNG Blob with fallback
export async function downloadBillImage(
  customer: Customer,
  month: string,
  deliveries: Delivery[],
  stats: BillStats
): Promise<void> {
  const canvas = createBillCanvas(customer, month, deliveries, stats);
  const safeName = customer.name.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_');
  const fileName = `Bill_${safeName}_${month}.png`;

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('फोटो बनाने में समस्या आई।');
        resolve();
        return;
      }

      // Try Native Web Share (WhatsApp, Drive, etc.) on Mobile Chrome
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Milk Bill - ${customer.name}`,
            text: `दूध डायरी बिल: ${customer.name} (${getFormattedMonth(month)})`
          });
          resolve();
          return;
        }
      } catch (shareErr) {
        // Share was cancelled or failed, fall back to direct download / open
        console.log('Web share not completed or cancelled, falling back to download');
      }

      // Fallback: Direct Download via Object URL
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1500);

      resolve();
    }, 'image/png');
  });
}

// Download PDF containing the rendered Bill Image
export async function downloadBillPDF(
  customer: Customer,
  month: string,
  deliveries: Delivery[],
  stats: BillStats
): Promise<void> {
  const canvas = createBillCanvas(customer, month, deliveries, stats);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const safeName = customer.name.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_');
  const fileName = `Bill_${safeName}_${month}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const imgWidth = 190;
  const pageHeight = 280;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, Math.min(imgHeight, pageHeight));
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Use jsPDF's built-in save which uses blob download
  pdf.save(fileName);
}
