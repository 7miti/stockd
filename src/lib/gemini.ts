import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ShoeLabelData {
  productName: string;
  brand: string;
  euSize: string;
  usSize: string;
  ukSize: string;
  color: string;
  sku: string;
  shoeType?: string;
}

export async function extractShoeData(base64Image: string): Promise<ShoeLabelData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Extract structured shoe information from this product label/box image. 
            Identify the brand, product name/model, sizes (EU, US, UK), color, and SKU/product code.
            Also try to detect the shoe type (running, casual, etc.).
            Return only valid JSON.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          brand: { type: Type.STRING },
          euSize: { type: Type.STRING },
          usSize: { type: Type.STRING },
          ukSize: { type: Type.STRING },
          color: { type: Type.STRING },
          sku: { type: Type.STRING },
          shoeType: { type: Type.STRING }
        },
        required: ["productName", "brand"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data extracted");
  return JSON.parse(text);
}
