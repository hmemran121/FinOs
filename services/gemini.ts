
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Wallet } from "../types";

// Use import.meta.env for Vite environment variables
const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "dummy_key";

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (API_KEY === "dummy_key") return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiInstance;
};

export interface FinancialInsight {
  insight: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const getFinancialInsights = async (transactions: Transaction[], wallets: Wallet[]): Promise<FinancialInsight[]> => {
  try {
    const context = `
      User Transactions: ${JSON.stringify(transactions.slice(0, 20))}
      User Wallets: ${JSON.stringify(wallets)}
      Task: Provide 3 short, punchy financial insights for a premium fintech app dashboard. 
      Focus on spending trends, savings opportunities, or budget alerts.
    `;

    const ai = getAi();
    if (!ai) throw new Error("AI Client not initialized");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: context,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              insight: { type: Type.STRING },
              urgency: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
            },
            required: ['insight', 'urgency']
          }
        }
      }
    });

    // Extract text using the .text property getter directly.
    const text = response.text;
    if (!text) return [];

    return JSON.parse(text) as FinancialInsight[];
  } catch (error) {
    console.error("AI Insights Error:", error);
    return [
      { insight: "Track your expenses to see AI-powered insights here.", urgency: "LOW" },
      { insight: "Your food spending is looking stable this week.", urgency: "LOW" }
    ];
  }
};

export interface CategorySuggestion {
  categoryName: string;
  confidence: number;
}

export const suggestCategory = async (note: string, amount: number): Promise<CategorySuggestion> => {
  try {
    const ai = getAi();
    if (!ai) return { categoryName: 'General', confidence: 0 };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a financial category for a transaction of ${amount} with note: "${note}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categoryName: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ['categoryName', 'confidence']
        }
      }
    });

    const text = response.text;
    if (!text) return { categoryName: 'General', confidence: 0 };

    return JSON.parse(text) as CategorySuggestion;
  } catch (error) {
    return { categoryName: 'General', confidence: 0 };
  }
};
