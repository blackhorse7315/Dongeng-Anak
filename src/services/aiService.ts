import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Story, StoryPage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiService = {
  async generateStory(title: string): Promise<StoryPage[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Buatlah cerita anak yang seru berdasarkan judul: "${title}". 
      Cerita harus terdiri dari 5 halaman. 
      Setiap halaman harus memiliki teks cerita yang menarik untuk anak-anak (dalam Bahasa Indonesia) 
      dan deskripsi visual yang detail untuk AI image generator (dalam Bahasa Inggris).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Teks cerita untuk halaman ini (Bahasa Indonesia)" },
              imagePrompt: { type: Type.STRING, description: "Detailed visual description for image generation (English)" }
            },
            required: ["text", "imagePrompt"]
          }
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "[]");
      return data;
    } catch (e) {
      console.error("Failed to parse story", e);
      throw new Error("Gagal membuat cerita. Coba judul lain!");
    }
  },

  async generateImage(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Children's book illustration style, whimsical, colorful, magic, soft lighting, high quality: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        },
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate image");
  },

  async generateNarration(text: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Bacakan cerita ini dengan nada yang ceria dan penuh petualangan untuk anak-anak: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    throw new Error("Failed to generate narration");
  }
};
