
import { GoogleGenAI } from "@google/genai";

// Guideline: Always use 'gemini-3-flash-preview' for basic text tasks.
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Generates a response from Gemini AI based on user prompt and optional context.
 */
export const generateResponse = async (
  prompt: string, 
  contextData?: string
): Promise<string> => {
  try {
    // Guideline: Create a new instance right before use and use process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let fullPrompt = prompt;
    
    if (contextData) {
      fullPrompt = `
      You are a helpful CRM assistant for a company called "ZILL TECH ENGINEERING SOLUTION LTD". 
      The user is currently viewing the following data on their screen:
      ${contextData}

      User Question: ${prompt}

      Answer concisely and helpfully based on the context provided.
      `;
    } else {
      fullPrompt = `You are a helpful CRM assistant. User Question: ${prompt}`;
    }

    // Guideline: Use ai.models.generateContent to query GenAI.
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: fullPrompt,
    });

    // Guideline: response.text is a property, not a method.
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please verify the system connectivity.";
  }
};
