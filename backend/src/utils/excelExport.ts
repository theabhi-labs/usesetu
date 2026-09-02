import ExcelJS from 'exceljs';
import { Response } from 'express';

/**
 * Streams a simple tabular Excel workbook directly to the response —
 * avoids buffering the whole file in memory for large exports.
 */
export const exportToExcel = async (
  res: Response,
  filename: string,
  columns: { header: string; key: string; width?: number }[],
  rows: Record<string, unknown>[],
): Promise<void> => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row).commit();
  }

  sheet.commit();
  await workbook.commit();
};
