import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

export const generateRecipe = async (ingredients: Product[]) => {
  // Initialization with explicit apiKey from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const ingredientNames = ingredients.map(i => i.name).join(", ");
  
  const prompt = `Crie uma receita saudável e criativa utilizando alguns ou todos os seguintes ingredientes disponíveis na minha cesta de orgânicos: ${ingredientNames}. 
  Você pode sugerir ingredientes adicionais comuns de despensa (sal, azeite, etc).
  A resposta deve ser estritamente em JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Nome da receita" },
            difficulty: { type: Type.STRING, description: "Fácil, Médio ou Difícil" },
            time: { type: Type.STRING, description: "Tempo de preparo" },
            ingredients: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de ingredientes com quantidades"
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Passo a passo do preparo"
            },
            healthBenefits: { type: Type.STRING, description: "Breve descrição dos benefícios para a saúde" }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
