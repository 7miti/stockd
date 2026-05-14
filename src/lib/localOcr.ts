import { createWorker } from 'tesseract.js';
import { ShoeLabelData } from './gemini';

export async function performLocalOCR(imageSrc: string): Promise<string> {
  const worker = await createWorker('eng');
  const ret = await worker.recognize(imageSrc);
  await worker.terminate();
  return ret.data.text;
}

export function parseShoeDataLocally(text: string): ShoeLabelData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const data: ShoeLabelData = {
    productName: 'Unknown Item',
    brand: 'Generic',
    euSize: '',
    usSize: '',
    ukSize: '',
    color: '',
    sku: '',
    shoeType: 'Casual'
  };

  // Very basic regex matching for local mode
  const euMatch = text.match(/EU\s*(\d+(\.\d+)?)/i) || text.match(/(\d{2}(\.\d+)?)\s*(EUR|EU)/i);
  if (euMatch) data.euSize = euMatch[1];

  const usMatch = text.match(/US\s*(\d+(\.\d+)?)/i) || text.match(/(\d+(\.\d+)?)\s*US/i);
  if (usMatch) data.usSize = usMatch[1];

  const ukMatch = text.match(/UK\s*(\d+(\.\d+)?)/i) || text.match(/(\d+(\.\d+)?)\s*UK/i);
  if (ukMatch) data.ukSize = ukMatch[1];

  const skuMatch = text.match(/[A-Z0-9]{5,10}-[A-Z0-9]{3}/i);
  if (skuMatch) data.sku = skuMatch[0].toUpperCase();

  // Pick the first line as potential product name if it's not a common brand
  const brands = ['NIKE', 'ADIDAS', 'PUMA', 'JORDAN', 'REEBOK', 'NEW BALANCE', 'ASICS', 'CONVERSE', 'VANS'];
  for (const brand of brands) {
    if (text.toUpperCase().includes(brand)) {
      data.brand = brand;
      break;
    }
  }

  if (lines.length > 0) {
    data.productName = lines[0].length > 3 ? lines[0] : (lines[1] || 'Scanned Label');
  }

  return data;
}
