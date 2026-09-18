import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/assistant", async (req, res) => {
    try {
      const { prompt, history, customers, todayStr } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `You are an AI assistant for a Milk Delivery Management app.
The user will give you instructions in Hindi, English, or Hinglish (any format).
Your job is to understand their intent and extract the necessary actions they want to take on their milk deliveries.

Current date is: ${todayStr}
Current customers list (JSON): ${JSON.stringify(customers)}

CRITICAL INSTRUCTION:
You MUST respond with a perfectly valid JSON object containing exactly two fields: "reply" and "actions".
1. "reply" (string): A natural, friendly response back to the user (in the same language they used). DO NOT INCLUDE THE ACTIONS IN THIS STRING.
2. "actions" (array): An array of action objects to perform.

Supported actions:
- { "type": "MARK_NOT_TAKEN", "customerId": "id", "date": "YYYY-MM-DD" }
- { "type": "UPDATE_DELIVERY", "customerId": "id", "date": "YYYY-MM-DD", "quantity": number, "rate": number }
- { "type": "ADD_CUSTOMER", "name": "string", "startDate": "YYYY-MM-DD", "session": "Morning" | "Evening", "milkType": "Cow" | "Buffalo", "quantity": number, "rate": number }
- { "type": "DELETE_CUSTOMER", "customerId": "id" }

Important Logic Rules:
- **Ambiguous Customer/Date**: If the user says a name that is NOT in the customer list, or multiple people match, or they don't specify the exact date/quantity and it's ambiguous, ask for clarification in the "reply" and return an EMPTY "actions" array []. Do not guess or invent data.
- **ADD_CUSTOMER**: If you lack info (like rate or quantity), ask the user in the "reply" and leave "actions" array EMPTY [].
- **DELETE_CUSTOMER**: If the user says "delete [customer]", ask for confirmation if ambiguous, else return DELETE_CUSTOMER action.
- Use current date (${todayStr}) if they say "aaj", "today".
- Find the exact customerId from the provided JSON list.`;

      let response;
      let lastError;
      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.6-flash'];
      
      // Build conversation contents for the API
      let contents = [];
      if (history && Array.isArray(history) && history.length > 0) {
        // We map 'assistant' to 'model'.
        contents = history.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));
        
        // Ensure prompt is also added at the end if it's not already in history
        const lastMsg = history[history.length - 1];
        if (lastMsg.text !== prompt) {
           contents.push({ role: 'user', parts: [{ text: prompt }] });
        }
      } else {
        contents = [{ role: 'user', parts: [{ text: prompt }] }];
      }

      for (const modelName of modelsToTry) {
        let retries = 3; // Increase to 3 retries per model
        while (retries > 0) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    reply: { type: Type.STRING },
                    actions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: { type: Type.STRING },
                          customerId: { type: Type.STRING },
                          date: { type: Type.STRING },
                          quantity: { type: Type.NUMBER },
                          rate: { type: Type.NUMBER },
                          name: { type: Type.STRING },
                          startDate: { type: Type.STRING },
                          session: { type: Type.STRING },
                          milkType: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            });
            break; // success
          } catch (err: any) {
            lastError = err;
            retries--;
            console.log(`Model ${modelName} failed. Retries left: ${retries}. Error:`, err.message || String(err));
            
            if (retries > 0) {
              // Exponential backoff
              const waitTime = (4 - retries) * 2500; 
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        if (response) break; // Got successful response, exit outer loop
      }

      if (!response) {
        throw lastError || new Error("Failed to get response from AI");
      }

      const text = response.text;
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process request with AI", details: error.message || String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
