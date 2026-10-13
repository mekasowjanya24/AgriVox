const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  const htmlPath = path.resolve(__dirname, 'AgriVox_Project_Report.html');
  const pdfPath = path.resolve(__dirname, 'AgriVox_Project_Report.pdf');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`Using browser executable: ${executablePath}`);
  console.log(`Loading HTML from: ${htmlPath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Navigate to local HTML file
  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle0',
    timeout: 60000
  });

  console.log('Rendering PDF with Puppeteer...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width: 100%; font-size: 9px; color: #718096; padding: 0 15mm; display: flex; justify-content: space-between; font-family: sans-serif;">
        <span>AgriVox — Engineering Project Report & Viva Documentation</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `
  });

  await browser.close();

  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`SUCCESS! Generated PDF: ${pdfPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB, ${stats.size} bytes)`);
  } else {
    throw new Error('PDF output file not found after generation.');
  }
}

generatePDF().catch(err => {
  console.error('PDF Generation failed:', err);
  process.exit(1);
});
