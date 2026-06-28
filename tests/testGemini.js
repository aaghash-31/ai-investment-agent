process.loadEnvFile(".env.local");
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GOOGLE_API_KEY or GEMINI_API_KEY in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listAndTestModels() {
  console.log("Fetching available Gemini models...\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Model list request failed:");
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    if (data.error) {
      console.error("API returned an error:");
      console.error(JSON.stringify(data.error, null, 2));
      return;
    }

    if (!Array.isArray(data.models) || data.models.length === 0) {
      console.error("No models returned.");
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    const generateModels = data.models
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));

    if (generateModels.length === 0) {
      console.error("Models were returned, but none support generateContent.");
      console.error(JSON.stringify(data.models, null, 2));
      return;
    }

    console.log("Models supporting generateContent:");
    generateModels.forEach((m) => console.log(" -", m));

    console.log("\nTesting each model...\n");

    for (const modelName of generateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say working in one word");
        const text = result.response.text();
        console.log(`OK ${modelName}: ${text.trim()}`);
      } catch (err) {
        console.log(`FAIL ${modelName}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Failed to list models:", err.message);
  }
}

listAndTestModels();