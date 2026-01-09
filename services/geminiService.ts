import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    const apiKey = process.env.API_KEY || '';
    // In a real app, we would handle missing keys more gracefully, 
    // but for this demo, we assume the environment is set up correctly.
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const generateResponse = async (
  prompt: string, 
  contextData?: string
): Promise<string> => {
  try {
    const client = getClient();
    const modelId = 'gemini-3-flash-preview';

    let fullPrompt = prompt;
    
    if (contextData) {
      fullPrompt = `
      You are a helpful CRM assistant for a company called "ZILL CRM". 
      The user is currently viewing the following data on their screen:
      ${contextData}

      User Question: ${prompt}

      Answer concisely and helpfully based on the context provided.
      `;
    } else {
      fullPrompt = `You are a helpful CRM assistant. User Question: ${prompt}`;
    }

    const response = await client.models.generateContent({
      model: modelId,
      contents: fullPrompt,
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please check your API key.";
  }
};