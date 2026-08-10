import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Download a DOM element as a high-quality PDF document.
 */
export async function downloadElementAsPDF(
  elementOrId: HTMLElement | string,
  fileName: string = 'documento.pdf'
): Promise<boolean> {
  try {
    const targetElement =
      typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!targetElement) {
      console.error('Elemento no encontrado para generar PDF:', elementOrId);
      return false;
    }

    // Capture element with html2canvas with white background
    const canvas = await html2canvas(targetElement, {
      scale: 2, // High resolution
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200, // Force standard desktop viewport width for crisp layout
    });

    const imgData = canvas.toDataURL('image/png');

    // Create jsPDF instance (A4 format)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add extra pages if content overflows A4 height
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Save file
    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    return true;
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return false;
  }
}

/**
 * Open a clean popup window containing the document for instant direct printing or saving as PDF.
 */
export function openCleanPrintWindow(elementOrId: HTMLElement | string, documentTitle: string) {
  const targetElement =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!targetElement) {
    console.error('Elemento no encontrado para imprimir:', elementOrId);
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    // Fallback if popups blocked
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${documentTitle}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #ffffff !important;
          color: #0f172a !important;
          padding: 20px;
          margin: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
        .printable-content {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
        }
        th {
          background-color: #f1f5f9 !important;
        }
      </style>
    </head>
    <body>
      <div className="printable-content">
        ${targetElement.innerHTML}
      </div>
      <script>
        window.onload = function() {
          // Remove screen buttons if any got copied
          document.querySelectorAll('.no-print').forEach(el => el.remove());
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
