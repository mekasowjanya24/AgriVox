import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateCyclePDF = async (cycleData, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const fontPath = path.resolve(__dirname, '../../assets/fonts/NotoSansTelugu-Regular.ttf');
      const hasTeluguFont = fs.existsSync(fontPath);
      if (hasTeluguFont) {
        doc.registerFont('TeluguFont', fontPath);
      }

      const primaryColor = '#1e4d2f';
      const secondaryColor = '#2b7847';
      const textColor = '#2c251e';
      const mutedColor = '#665a4c';
      const highlightBg = '#f2ebd9';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(22).text('AgriVox - Season Farm Report', 55, 55, { bold: true });
      doc.fontSize(11).text('రైతు ఆదాయ & ఖర్చుల సమగ్ర నివేదిక', 55, 82);

      let y = 115;

      // Meta Information Box
      doc.rect(40, y, 515, 75).fillAndStroke('#faf8f2', '#ded7c5');
      doc.fillColor(textColor).fontSize(10);

      const farmerName = user.name || 'Farmer';
      const farmerPhone = user.phone || '';
      const plotName = cycleData.plotId?.name || 'Main Plot';
      const plotArea = cycleData.plotId?.areaAcres || 1;
      const crop = cycleData.crop || 'Crop';
      const season = cycleData.season || '';
      const year = cycleData.year || new Date().getFullYear();
      const sowingDate = cycleData.sowingDate ? new Date(cycleData.sowingDate).toLocaleDateString() : 'N/A';
      const harvestDate = cycleData.expectedHarvestDate ? new Date(cycleData.expectedHarvestDate).toLocaleDateString() : 'N/A';

      doc.text(`Farmer: ${farmerName} (${farmerPhone})`, 55, y + 12);
      doc.text(`Plot: ${plotName} (${plotArea} Acres, ${cycleData.plotId?.soilType || ''} soil)`, 55, y + 30);
      doc.text(`Crop: ${crop} | Season: ${season} ${year}`, 55, y + 48);

      doc.text(`Sowing Date: ${sowingDate}`, 320, y + 12);
      doc.text(`Harvest Date: ${harvestDate}`, 320, y + 30);
      doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 320, y + 48);

      y += 90;

      // Financial Summary Cards
      const cardWidth = 120;
      const cardHeight = 50;

      const summaryCards = [
        { label: 'Total Expense', value: `Rs. ${Number(cycleData.totalExpense || 0).toLocaleString('en-IN')}`, color: '#c2410c' },
        { label: 'Total Revenue', value: `Rs. ${Number(cycleData.totalRevenue || 0).toLocaleString('en-IN')}`, color: '#15803d' },
        { label: 'Net Profit', value: `Rs. ${Number(cycleData.netProfit || 0).toLocaleString('en-IN')}`, color: cycleData.netProfit >= 0 ? '#15803d' : '#b91c1c' },
        { label: 'Profit / Acre', value: `Rs. ${Number(cycleData.profitPerAcre || 0).toLocaleString('en-IN')}`, color: primaryColor },
      ];

      summaryCards.forEach((card, idx) => {
        const xPos = 40 + idx * (cardWidth + 11);
        doc.rect(xPos, y, cardWidth, cardHeight).fillAndStroke(highlightBg, '#ded7c5');
        doc.fillColor(mutedColor).fontSize(8).text(card.label.toUpperCase(), xPos + 10, y + 8);
        doc.fillColor(card.color).fontSize(12).text(card.value, xPos + 10, y + 25, { bold: true });
      });

      y += 65;

      // Expenses by Category
      doc.fillColor(primaryColor).fontSize(13).text('Expense Breakdown by Category', 40, y, { underline: true });
      y += 20;

      const expenses = cycleData.expenses || [];
      const catMap = {};
      expenses.forEach((e) => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      });

      const catList = Object.entries(catMap);
      if (catList.length === 0) {
        doc.fillColor(mutedColor).fontSize(10).text('No expenses recorded for this cycle.', 40, y);
        y += 20;
      } else {
        catList.forEach(([cat, amt]) => {
          doc.fillColor(textColor).fontSize(9).text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}: Rs. ${Number(amt).toLocaleString('en-IN')}`, 45, y);
          y += 14;
        });
        y += 10;
      }

      // Recent Expenses Table
      doc.fillColor(primaryColor).fontSize(13).text('Itemized Expenses', 40, y, { underline: true });
      y += 20;

      // Table Header
      doc.rect(40, y, 515, 20).fill(secondaryColor);
      doc.fillColor('#ffffff').fontSize(9);
      doc.text('Date', 50, y + 5);
      doc.text('Category', 140, y + 5);
      doc.text('Item Description', 250, y + 5);
      doc.text('Amount (INR)', 450, y + 5);
      y += 22;

      const displayExpenses = expenses.slice(0, 15);
      displayExpenses.forEach((exp, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9f6ee';
        doc.rect(40, y, 515, 18).fill(rowBg);
        doc.fillColor(textColor).fontSize(8);
        doc.text(new Date(exp.date).toLocaleDateString(), 50, y + 4);
        doc.text(exp.category, 140, y + 4);
        doc.text(exp.item || '', 250, y + 4);
        doc.text(`Rs. ${Number(exp.amount).toLocaleString('en-IN')}`, 450, y + 4);
        y += 18;
      });

      y += 15;

      // Harvests Table
      const harvests = cycleData.harvests || [];
      doc.fillColor(primaryColor).fontSize(13).text('Harvest & Sales', 40, y, { underline: true });
      y += 20;

      doc.rect(40, y, 515, 20).fill(secondaryColor);
      doc.fillColor('#ffffff').fontSize(9);
      doc.text('Date', 50, y + 5);
      doc.text('Qty (Quintals)', 140, y + 5);
      doc.text('Price / Qtl', 240, y + 5);
      doc.text('Total Revenue', 340, y + 5);
      doc.text('Market / Buyer', 440, y + 5);
      y += 22;

      if (harvests.length === 0) {
        doc.rect(40, y, 515, 18).fill('#f9f6ee');
        doc.fillColor(mutedColor).fontSize(8).text('No harvest sales recorded yet.', 50, y + 4);
        y += 20;
      } else {
        harvests.forEach((h, i) => {
          const rowBg = i % 2 === 0 ? '#ffffff' : '#f9f6ee';
          doc.rect(40, y, 515, 18).fill(rowBg);
          doc.fillColor(textColor).fontSize(8);
          doc.text(new Date(h.date).toLocaleDateString(), 50, y + 4);
          doc.text(`${h.quantityQuintals} Qtl`, 140, y + 4);
          doc.text(`Rs. ${Number(h.pricePerQuintal).toLocaleString('en-IN')}`, 240, y + 4);
          doc.text(`Rs. ${Number(h.quantityQuintals * h.pricePerQuintal).toLocaleString('en-IN')}`, 340, y + 4);
          doc.text(`${h.market || ''} ${h.buyer ? '(' + h.buyer + ')' : ''}`, 440, y + 4);
          y += 18;
        });
      }

      // Footer
      doc.fontSize(8).fillColor(mutedColor).text(
        'Generated by AgriVox - Empowering Farmers with Voice & Data. https://agrivox.app',
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
