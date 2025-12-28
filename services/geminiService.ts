
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Language } from "../types";

export class GeminiService {
  /**
   * Performs OCR and literary analysis. 
   * Uses gemini-3-pro-preview for maximum reasoning capacity and visual understanding.
   */
  static async analyzeText(imageInBase64: string, targetLanguage: Language, mimeType: string = 'image/jpeg'): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Gemini 3 Pro is better for complex multimodal tasks and following strict JSON schemas under pressure.
    const modelName = 'gemini-3-pro-preview';

    const systemInstruction = `
      You are "Insight's Reader", a world-class literary scholar and visual analyst. 
      Your task is to analyze images of text (like book pages or handwritten letters).

      STRICT RULES:
      1. OCR: Transcribe all visible text.
      2. VISUAL FALLBACK: If NO text is readable or present, you MUST write a detailed description of the visual scene in the "originalText" field (e.g., "An image of a candle illuminating an old leather book").
      3. TRANSLATION: Translate the transcription or description into ${targetLanguage}.
      4. JSON: Return ONLY a valid JSON object matching the provided schema.
      5. NEVER FAIL: Do not use placeholders if you can describe the scene. Do not return an empty response.
    `;

    const prompt = `
      Please analyze this image. 
      - If there is text, transcribe it. 
      - If there is no text, describe what you see visually. 
      - Translate all analysis into ${targetLanguage}. 
      - Generate a high-quality cinematic prompt in English for the "imagePrompt" field.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: imageInBase64, mimeType: mimeType } },
            { text: prompt }
          ]
        },
        config: {
          systemInstruction,
          // Thinking budget helps the model process visual details before generating JSON
          thinkingConfig: { thinkingBudget: 4000 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              sourceLanguage: { type: Type.STRING },
              visualDetails: {
                type: Type.OBJECT,
                properties: {
                  characters: { type: Type.STRING },
                  gestures: { type: Type.STRING },
                  environment: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  mood: { type: Type.STRING }
                },
                required: ["characters", "gestures", "environment", "lighting", "mood"]
              },
              imagePrompt: { type: Type.STRING }
            },
            required: ["originalText", "translatedText", "sourceLanguage", "visualDetails", "imagePrompt"]
          }
        }
      });

      const text = response.text;
      if (!text || text.trim() === "") {
        throw new Error("The scholar's study is empty. Please try a clearer image.");
      }
      
      return JSON.parse(text.trim()) as AnalysisResult;
    } catch (error: any) {
      console.error("Analysis Failure:", error);
      // Catch common JSON parsing or model refusal errors
      if (error.message?.includes("Safety") || error.message?.includes("blocked")) {
        throw new Error("This content cannot be interpreted due to safety restrictions.");
      }
      throw new Error(error.message || "The scholar's study is closed. Please try again.");
    }
  }

  static async analyzeRawText(rawText: string, targetLanguage: Language): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-pro-preview';
    
    const systemInstruction = `
      You are "Insight's Reader", an elite literary scholar. 
      Translate the passage into literary ${targetLanguage} and analyze its visual properties.
      Return JSON.
    `;

    const prompt = `
      Analyze: "${rawText}"
      1. Translation: ${targetLanguage}.
      2. Details: Mood/Setting in ${targetLanguage}.
      3. Prompt: Cinematic English generation prompt.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 2000 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              sourceLanguage: { type: Type.STRING },
              visualDetails: {
                type: Type.OBJECT,
                properties: {
                  characters: { type: Type.STRING },
                  gestures: { type: Type.STRING },
                  environment: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  mood: { type: Type.STRING }
                },
                required: ["characters", "gestures", "environment", "lighting", "mood"]
              },
              imagePrompt: { type: Type.STRING }
            },
            required: ["originalText", "translatedText", "sourceLanguage", "visualDetails", "imagePrompt"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}") as AnalysisResult;
      parsed.originalText = rawText;
      return parsed;
    } catch (error: any) {
      throw new Error("Text interpretation failed.");
    }
  }

  static async generateImage(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `High-fidelity cinematic literary masterpiece, atmospheric, detailed, soft volumetric lighting: ${prompt}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Image generation failed.");
    return `data:image/png;base64,${part.inlineData.data}`;
  }
}
