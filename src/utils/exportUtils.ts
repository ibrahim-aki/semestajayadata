
import ExcelJS from 'exceljs';

/**
 * Generates a safe filename by removing illegal characters.
 * @param name The original filename.
 * @returns A sanitized filename.
 */
export const sanitizeFilename = (name: string): string => {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
};

/**
 * Internal function to trigger the download of a pre-built workbook.
 * Uses a specific MIME type for .xlsx files to ensure correct handling by browsers.
 * @param buffer The Excel file buffer.
 * @param filename The desired name for the downloaded file.
 */
const downloadWorkbook = (buffer: ArrayBuffer, filename: string) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
};

export interface SheetRequest {
  sheetName: string;
  data: any[];
}

/**
 * Creates and downloads an Excel file using ExcelJS. This function is optimized:
 * 1. It intelligently skips creating empty sheets.
 * 2. It automatically adjusts column widths based on content.
 * @param sheetRequests An array of objects, each with a sheetName and data array.
 * @param filename The name for the downloaded Excel file.
 */
export const createAndDownloadExcel = async (sheetRequests: SheetRequest[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  let hasContent = false;

  sheetRequests.forEach(req => {
    // Only process and add sheets that have data.
    if (req.data && req.data.length > 0) {
      const worksheet = workbook.addWorksheet(req.sheetName);
      
      // Define columns from the keys of the first data object
      const headers = Object.keys(req.data[0]);
      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 15 // default width
      }));
      
      // Add rows
      worksheet.addRows(req.data);

      // Auto-fit columns based on content
      worksheet.columns.forEach(column => {
          let maxLength = 0;
          const header = column.header; 
          
          if (header) {
              const headerText = Array.isArray(header) ? header.join(', ') : String(header);
              maxLength = headerText.length;
          }
          
          column.eachCell!({ includeEmpty: true }, cell => {
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxLength) {
                  maxLength = columnLength;
              }
          });
          column.width = maxLength < 50 ? maxLength + 2 : 50;
      });

      hasContent = true;
    }
  });

  // Only trigger download if at least one sheet had content.
  if (hasContent) {
    const buffer = await workbook.xlsx.writeBuffer();
    downloadWorkbook(buffer, sanitizeFilename(filename));
  } else {
    // Inform the user that there's nothing to export.
    alert('Tidak ada data untuk diekspor.');
  }
};