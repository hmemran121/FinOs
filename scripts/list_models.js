
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const key = "AIzaSyBnr0wOZMNJv8ymth_Fsi-BB07ZPkYfB5I";

console.log("Using Key:", key ? key.substring(0, 5) + "..." : "NONE");

const ai = new GoogleGenAI({ apiKey: key });

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log("Available Models:");

        // Handle pagination or array
        if (response.models) {
            response.models.forEach(m => {
                console.log(m.name);
            });
        } else {
            // Try strict iteration if it handles it
            for (const m of response.models || []) {
                if (m.name.includes('gemini')) console.log(m.name);
            }
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
