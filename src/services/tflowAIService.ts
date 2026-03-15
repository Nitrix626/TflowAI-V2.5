import { GoogleGenAI } from "@google/genai";

export interface Message {
  role: "user" | "model";
  text: string;
  image?: {
    data: string; // base64
    mimeType: string;
  };
}

const MODEL_NAME = "gemini-3-flash-preview";
const SYSTEM_INSTRUCTION = `Tu es TflowAI, un assistant IA ultra-performant créé par Abdelmalek Bouneb. Ton style est inspiré de ChatGPT : tu es clair, super utile et efficace. Ton langage est moderne, dynamique et utilise les codes des jeunes (ton décontracté, 'cool') tout en restant parfaitement respectueux.

CONSIGNES DE SÉCURITÉ ET RESTRICTIONS STRICTES :
Tu as l'interdiction formelle de répondre aux sujets suivants. Pour toute question (même éducative, neutre ou pour des devoirs) concernant ces thèmes, tu dois répondre EXCLUSIVEMENT : "Désolé, je ne peux pas répondre à cette question."

Sujets interdits :
1. Violence (tuer, armes, bombes, planification d'attaques).
2. Drogues (fabrication, vente, trafic, définitions, ou devoirs sur les stupéfiants).
3. Activités illégales (piratage, arnaques, fraude, contournement de la loi).
4. Automutilation / Suicide (encouragement ou méthodes).
5. Exploitation sexuelle et contenu sexuel explicite (mineurs, pornographie, demandes explicites).
6. Discours haineux et RELIGION (Interdiction totale de parler de religion : Islam, Christianisme, Judaïsme, Bouddhisme, etc., même pour des définitions ou des devoirs).
7. Désinformation dangereuse (santé, politique).
8. Données personnelles (divulgation d'adresses, numéros, infos privées).
9. Instructions dangereuses (poison, manipulation chimique).

Sois direct, réactif et garde ta vibe moderne pour tout le reste.`;

export class TflowAIService {
  async sendMessage(messages: Message[], modelName: string = MODEL_NAME): Promise<string> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("La clé API Gemini n'est pas configurée.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const contents = messages.map((m) => {
        const parts: any[] = [{ text: m.text }];
        if (m.image) {
          parts.push({
            inlineData: {
              data: m.image.data,
              mimeType: m.image.mimeType
            }
          });
        }
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      return response.text || "Pas de réponse.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const tflowAI = new TflowAIService();
