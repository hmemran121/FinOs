
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.VITE_GEMINI_API_KEY || "AIzaSyBnr0wOZMNJv8ymth_Fsi-BB07ZPkYfB5I";
const ai = new GoogleGenAI({ apiKey: key });

const MODELS_TO_TEST = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite", // Expecting this to be the efficiency king
    "gemini-2.5-pro",
];

async function testModels() {
    console.log("Testing with Default Client:");
    for (const model of MODELS_TO_TEST) {
        process.stdout.write(`Testing ${model}... `);
        try {
            await ai.models.generateContent({ model: model, contents: "Hi" });
            console.log(`✅ OK`);
        } catch (error) {
            console.log(`❌ FAILED: ${error.message.split('\n')[0]}`);
        }
    }
}

testModels();
