import { GoogleGenAI, Type } from "@google/genai";
import { WishResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateMagicalWish = async (userWish: string): Promise<WishResponse> => {
  if (!apiKey) {
    return {
      message: "The stars align to grant your wish in silence. (API Key missing)",
      magicalFactor: 88
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user's wish is: "${userWish}". 
      You are the Spirit of the Golden Evergreen.
      Write a short, poetic, and luxurious blessing (max 25 words) that grants this wish in a metaphorical way. 
      Use words related to gold, light, emerald, and eternity.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            magicalFactor: { type: Type.NUMBER, description: "A random number between 80 and 100" }
          },
          required: ["message", "magicalFactor"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Spirit");
    
    return JSON.parse(text) as WishResponse;
  } catch (error) {
    console.error("The spirits are quiet:", error);
    return {
      message: "Your wish whispers through the golden branches, heard by the stars.",
      magicalFactor: 90
    };
  }
};