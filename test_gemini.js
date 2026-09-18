import { GoogleGenAI } from "@google/genai";
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Try 3.5 first
  const models = ['gemini-3.5-flash', 'gemini-3.8-flash'];
  
  for (const m of models) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: "Hello",
      });
      console.log(`${m} Success:`, response.text);
    } catch (e) {
      console.error(`${m} Error:`, e.message);
    }
  }
}
test();
