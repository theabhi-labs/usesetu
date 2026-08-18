import { getNextSequence } from '../models/counter.model';

export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`invoice-${year}`);
  return `INV-${year}-${String(seq).padStart(6, '0')}`;
};

export const generateReceiptNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`receipt-${year}`);
  return `RCPT-${year}-${String(seq).padStart(6, '0')}`;
};
