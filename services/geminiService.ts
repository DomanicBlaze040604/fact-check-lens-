import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { FactCheckResponse } from '../types';

let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (aiClient) return aiClient;

  // Safely retrieve API key to avoid ReferenceError: process is not defined
  let apiKey: string | undefined;
  try {
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Could not access process.env");
  }

  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
};

export const analyzeContent = async (text: string, imageBase64?: string, mode: 'standard' | 'deep' = 'standard'): Promise<FactCheckResponse> => {
  try {
    const ai = getAiClient();
    const parts: any[] = [];
    
    // Construct the prompt based on mode
    let promptPrefix = "";
    if (mode === 'deep') {
      promptPrefix = "CONDUCT A DEEP DIVE ANALYSIS. Search extensively for historical context, scientific consensus, and multiple viewpoints. Be extremely rigorous with evidence selection. ";
    }

    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg',
        },
      });
      parts.push({
        text: `${promptPrefix}Analyze this image. ${text ? 'Context: ' + text : ''}`
      });
    } else {
      // Check if text looks like a URL for specific instruction
      const isUrl = /^(http|https):\/\/[^ "]+$/.test(text.trim());
      if (isUrl) {
         parts.push({ text: `${promptPrefix}Analyze the content at this URL: ${text}. Extract claims and verify them.` });
      } else {
         parts.push({ text: `${promptPrefix}${text}` });
      }
    }

    // SPEED OPTIMIZATION:
    // Use 'gemini-2.5-flash' for standard requests -> Very Fast.
    // Use 'gemini-3-pro-preview' for deep requests -> High Intelligence.
    const modelId = mode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';

    // NOTE: When using googleSearch tool, we CANNOT use responseMimeType: 'application/json' or responseSchema.
    // We rely on the system instruction to force JSON format.
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        // Flash models handle JSON instructions very well even without schema enforcement if prompted correctly
      },
    });

    const resultText = response.text;
    if (!resultText) {
        throw new Error("Received empty response from the model.");
    }

    try {
        // Robustly extract JSON from the text response
        // The model might wrap it in ```json ... ``` or just text
        const firstOpen = resultText.indexOf('{');
        const lastClose = resultText.lastIndexOf('}');
        
        if (firstOpen === -1 || lastClose === -1) {
            console.error("Raw response:", resultText);
            throw new Error("Response did not contain valid JSON structure.");
        }
        
        const jsonString = resultText.substring(firstOpen, lastClose + 1);
        const jsonResponse = JSON.parse(jsonString) as FactCheckResponse;
        
        // Basic validation
        if (!jsonResponse.claims || !jsonResponse.overall_verdict) {
            throw new Error("Response JSON missing required fields.");
        }

        return jsonResponse;
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.log("Raw Text:", resultText);
        throw new Error("Failed to parse the fact-check results. The AI model output was not valid JSON.");
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "An unexpected error occurred during analysis.";
    
    // Handle specific error types
    if (error.message) {
        if (error.message.includes("API Key is missing")) errorMessage = "API Key configuration error. Please check your environment.";
        else if (error.message.includes("400")) errorMessage = "Request failed (400). Please try different content.";
        else if (error.message.includes("403")) errorMessage = "Permission denied. Please check API key and enabled services.";
        else if (error.message.includes("404")) errorMessage = "Model or resource not found.";
        else if (error.message.includes("429")) errorMessage = "Too many requests. Please wait a moment.";
        else if (error.message.includes("SAFETY")) errorMessage = "Content blocked due to safety settings.";
        // Pass through specific parsing or internal errors
        else if (error.message.includes("JSON") || error.message.includes("response")) errorMessage = error.message;
        else errorMessage = `Analysis failed: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};