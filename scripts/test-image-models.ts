import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const prompt =
  "Premium marketing creative for Barista Coffee. Warm premium coffee brand, appetizing beverage hero shot, square 1:1.";

const models = [
  "imagen-3.0-generate-002",
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
  "gemini-2.5-flash-image",
];

for (const model of models) {
  const start = Date.now();
  try {
    if (model.startsWith("gemini-")) {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (part) => "inlineData" in part && part.inlineData?.mimeType?.startsWith("image/"),
      );
      console.log(
        model,
        imagePart ? `OK (${Date.now() - start}ms)` : `no image in response (${Date.now() - start}ms)`,
      );
      continue;
    }

    const response = await ai.models.generateImages({
      model,
      prompt,
      config: { numberOfImages: 1 },
    });
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    console.log(model, imageBytes ? `OK (${Date.now() - start}ms)` : `empty (${Date.now() - start}ms)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(model, `FAIL (${Date.now() - start}ms):`, msg.slice(0, 180));
  }
}
