const fs = require('fs');
const path = require('path');

function generateSamplePDF(filePath) {
  const content = 
    'BT /F1 12 Tf 50 720 Td (Module 5: Concurrency and Synchronization in Operating Systems) Tj ' +
    '0 -25 Td (Critical Section Problem: Mutual Exclusion, Progress, Bounded Waiting.) Tj ' +
    '0 -25 Td (Semaphores: Counting and Binary Semaphores with wait and signal operations.) Tj ' +
    '0 -25 Td (Classic Synchronization Problems: Bounded-Buffer, Readers-Writers, Dining Philosophers.) Tj ' +
    '0 -25 Td (Deadlock Prevention: Negating one of four Coffman conditions.) Tj ' +
    '0 -25 Td (Banker Algorithm for Deadlock Avoidance using safe state evaluation.) Tj ET';

  const streamLen = content.length;
  const pdfData = 
'%PDF-1.4\n' +
'1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n' +
'2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n' +
'3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>> endobj\n' +
'4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n' +
'5 0 obj <</Length ' + streamLen + '>> stream\n' + content + '\nendstream\nendobj\n' +
'xref\n' +
'0 6\n' +
'0000000000 65535 f \n' +
'0000000009 00000 n \n' +
'0000000058 00000 n \n' +
'0000000115 00000 n \n' +
'0000000224 00000 n \n' +
'0000000293 00000 n \n' +
'trailer <</Size 6 /Root 1 0 R>>\n' +
'startxref\n' +
(370 + streamLen) + '\n%%EOF';

  fs.writeFileSync(filePath, Buffer.from(pdfData));
  console.log('Successfully created valid test PDF at:', filePath);
}

const targetPath = path.join(__dirname, 'sample_concurrency_module.pdf');
generateSamplePDF(targetPath);
