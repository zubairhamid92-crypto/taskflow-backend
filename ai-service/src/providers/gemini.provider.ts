import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});
console.log("Gemini Key", process.env.GEMINI_API_KEY);
class GeminiProvider {

    async generate(prompt: string) {

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
        });

        return response.text;

    }

}

export default new GeminiProvider();