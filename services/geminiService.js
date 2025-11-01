

const { GoogleGenAI } = require("@google/genai");

let ai;

// Fetches API key. In a server environment, this would use a secure method
// like Google Secret Manager. The workbench will patch this function.
const getApiKey = async () => {
    // This is the server-side implementation.
    // The workbench will wrap this in an else block and add a browser-friendly
    // version for its own execution context.
    const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    const name = process.env.GEMINI_API_KEY_SECRET_NAME; // e.g., projects/my-project/secrets/GEMINI_API_KEY/versions/latest
    if (!name) {
        throw new Error('GEMINI_API_KEY_SECRET_NAME environment variable not set.');
    }
    const [version] = await client.accessSecretVersion({ name });
    const apiKey = version.payload.data.toString('utf8');
    return apiKey;
};


// Initializes and returns a singleton GoogleGenAI instance
const getAi = async () => {
    if (!ai) {
        const apiKey = await getApiKey();
        if (!apiKey) {
            throw new Error("API_KEY is not configured.");
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

// Helper to convert data URL to parts for the Gemini API
const dataUrlToParts = (dataUrl) => {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
        throw new Error('Invalid data URL format');
    }
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const base64 = parts[1];
    return { base64, mimeType };
};

// Creates a generative part from file data
const fileToGenerativePart = (base64, mimeType) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

// Validates the structure of a bounding box object
const isValidBoundingBox = (box) => {
    return box &&
        typeof box.x === 'number' &&
        typeof box.y === 'number' &&
        typeof box.width === 'number' &&
        typeof box.height === 'number';
};

// Function to identify items in an image and estimate their value
const identifyItemsInImage = async (photoDataUrl) => {
  if (typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:')) {
    throw new Error('Invalid input: A valid data URL string is required.');
  }

  const model = "gemini-2.5-pro";
  const { base64, mimeType } = dataUrlToParts(photoDataUrl);

  const prompt = `You are an expert home inventory assistant. Analyze the following image.
Identify the distinct, significant items in the image that a person would want to include in a home inventory for insurance purposes. Ignore small, generic, or low-value items.
For each item you identify:
1. Use your search tool to find a comparable product currently available for sale and determine its estimated replacement value in USD.
2. Provide the URL for the source of this valuation.
3. Provide the bounding box coordinates for the item in the image. The bounding box should be an object with "x", "y", "width", and "height" keys, where each value is a percentage of the image's total dimensions (e.g., {"x": 10, "y": 20, "width": 30, "height": 40}).

Provide your response as a JSON array of objects. Each object must have the following keys: "name", "category", "estimatedValue" (a number), "sourceUrl", and "boundingBox".
If you cannot find a value or source for an item, set the value to 0 and the sourceUrl to an empty string. If you cannot determine a bounding box, omit the key.
Do not include anything in your response other than the valid JSON array.`;

  try {
    const genAI = await getAi();
    const imagePart = fileToGenerativePart(base64, mimeType);
    const result = await genAI.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
          tools: [{googleSearch: {}}],
        },
      }
    );

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch || !jsonMatch[0]) {
      throw new Error("Could not parse a valid JSON array from the model's response.");
    }

    const itemsJson = JSON.parse(jsonMatch[0]);

    if (!itemsJson || !Array.isArray(itemsJson)) {
        throw new Error("Could not identify items in the image.");
    }

    return itemsJson.map((item) => ({
      name: item.name || 'Untitled Item',
      category: item.category || 'Uncategorized',
      estimatedValue: typeof item.estimatedValue === 'number' ? item.estimatedValue : 0,
      sourceUrl: item.sourceUrl || '',
      status: 'Needs Review',
      notes: '',
      serialNumber: '',
      boundingBox: isValidBoundingBox(item.boundingBox) ? item.boundingBox : undefined,
    }));
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(`An error occurred while analyzing the image: ${error.message}`);
  }
};

const getPropertyMetadata = async (args) => {
    // Validation for the simplified { "address": ... } structure
    if (!args || !args.address ||
        !args.address.street || !args.address.city ||
        !args.address.state || !args.address.zip) {
        throw new Error('Invalid argument: A complete address object is required.');
    }

    // Access address directly from args
    const { street, city, state, zip } = args.address;
    const fullAddress = `${street}, ${city}, ${state} ${zip}`;
    const model = "gemini-2.5-flash";
    
    const prompt = `You are an expert AI agent specializing in real estate data aggregation. Your sole function is to process a property address and return a structured JSON object containing verified public data.

**PROPERTY ADDRESS FOR ANALYSIS:**
"${fullAddress}"

**MISSION:**
Your mission is to use your available tools (Google Search and Google Maps) to gather and consolidate public data for the specified property address.

**PROCESS:**
1.  **Search Real Estate Listing Sites:** Use your Google Search tool to query major real estate portals (e.g., Zillow, Redfin). Extract the following details:
    *   Property characteristics (type, year built, lot size, living area, bedrooms, bathrooms)
    *   Public-facing property description
    *   The direct URL to the most relevant listing
    *   The most recent sales history (last sale price and date)

2.  **Search Official Government Records:** Use your Google Search tool to find the official county assessor or tax collector website for the property's location. Extract the following official data:
    *   Assessed values (total, land, improvements) for the most recent tax year
    *   Official Parcel ID (APN)
    *   Publicly listed owner's name
    *   The direct URL to the official assessment or parcel information page

3.  **Generate Geospatial URLs:** Use your Google Maps tool based on the provided address to construct and validate the following URLs:
    *   A direct URL to a local map view centered on the property.
    *   A direct URL to the Google Maps Street View image for the property.

**OUTPUT REQUIREMENTS:**
You MUST consolidate all retrieved information into a single JSON object.

*   The output MUST be **ONLY** the raw JSON object, without any additional text, explanations, or markdown formatting (like \`\`\`json).
*   The JSON object's structure MUST strictly conform to the schema below.
*   If you cannot find a specific piece of data from a reliable source after a thorough search, you MUST use the value **null** for that field.

**JSON SCHEMA:**
{
  "propertyType": "string",
  "yearBuilt": "number",
  "lotSizeAcres": "number",
  "livingAreaSqFt": "number",
  "bedrooms": "number",
  "bathrooms": "number",
  "description": "string",
  "listingUrl": "string",
  "lastSalePrice": "number",
  "lastSaleDate": "string",
  "assessedValue": "number",
  "taxYear": "number",
  "landValue": "number",
  "improvementsValue": "number",
  "parcelId": "string",
  "ownerName": "string",
  "assessmentUrl": "string",
  "mapUrl": "string",
  "streetViewUrl": "string"
}

**CRITICAL INSTRUCTIONS:**
- **DO NOT** hallucinate, invent, or estimate data. If a fact cannot be verified from a public source, its corresponding field value MUST be \`null\`.
- **RETURN ONLY THE JSON.** Your entire response must be the JSON object itself.`;

    try {
        const genAI = await getAi();
        const result = await genAI.models.generateContent({
            model,
            contents: { parts: [{text: prompt}] },
            config: {
                tools: [{ googleSearch: {} }, { googleMaps: {} }],
            },
        });

        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
          throw new Error("Could not parse a valid JSON object from the model's response.");
        }
        
        const mergedData = JSON.parse(jsonMatch[0]);

        if (Object.keys(mergedData).length === 0 || Object.values(mergedData).every(v => v === null)) {
          throw new Error("Unable to find property details");
        }

        return mergedData;
    } catch (e) {
        console.error("Property metadata error:", e);
        throw new Error(`Failed to retrieve property metadata: ${e.message}`);
    }
};


module.exports = {
    identifyItemsInImage,
    getPropertyMetadata,
};
