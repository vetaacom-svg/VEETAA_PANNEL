
import { GoogleGenAI, Type } from "@google/genai";
import { Driver, Store, User, AIRecommendation } from '../types';
import { calculateDistance } from '../utils/geoUtils';

// Always use named parameter for apiKey and access process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getDispatchRecommendation = async (
  orderId: string,
  user: User,
  store: Store,
  drivers: Driver[]
): Promise<AIRecommendation> => {
  // Pre-filter available drivers and calculate distances to the store
  const availableDrivers = drivers.filter(d => d.status === 'available');
  
  const driverData = availableDrivers.map(d => ({
    id: d.id,
    name: d.name,
    distanceToStore: calculateDistance(d.lat, d.lng, store.lat, store.lng),
    distanceFromStoreToUser: calculateDistance(store.lat, store.lng, user.lat, user.lng)
  }));

  const prompt = `
    Context: You are a delivery dispatcher for a logistics platform in Morocco. 
    Task: Choose the best driver for an order from ${store.name} to ${user.name}.
    
    Data:
    - Target User: ${user.name} at [${user.lat}, ${user.lng}]
    - Target Store: ${store.name} at [${store.lat}, ${store.lng}]
    - Available Drivers: ${JSON.stringify(driverData)}
    
    Rules:
    - Primary factor: Lowest distance to store.
    - Secondary factor: Driver positioning relative to the final destination.
    - Provide a short, logical reasoning in English.
  `;

  try {
    // Generate content using the recommended Gemini 3 Flash model for logic tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedDriverId: {
              type: Type.STRING,
              description: 'The ID of the recommended driver.'
            },
            reasoning: {
              type: Type.STRING,
              description: 'Reasoning for choosing this driver.'
            },
            estimatedTime: {
              type: Type.STRING,
              description: 'Estimated time for the driver to reach the store.'
            }
          },
          required: ['suggestedDriverId', 'reasoning', 'estimatedTime'],
          propertyOrdering: ["suggestedDriverId", "reasoning", "estimatedTime"]
        }
      }
    });

    // Directly access .text property from GenerateContentResponse
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as AIRecommendation;
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    // Fallback: Pick closest driver manually if the API call fails or yields unexpected results
    const closest = driverData.sort((a, b) => a.distanceToStore - b.distanceToStore)[0];
    return {
      suggestedDriverId: closest?.id || (drivers.length > 0 ? drivers[0].id : "unknown"),
      reasoning: "Automatic fallback to closest driver based on raw GPS data due to service interruption.",
      estimatedTime: "Estimated based on distance (approx. 10-15 mins)."
    };
  }
};
