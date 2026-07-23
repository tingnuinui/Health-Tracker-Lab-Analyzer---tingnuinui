import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface AIModel {
  id: string;
  modelId: string;
  name: string;
  category: string;
  isActive: boolean;
  order: number;
  isDefaultLevel1: boolean;
  isDefaultLevel2: boolean;
}

export type ModelCategory = 'text' | 'image' | 'video' | 'tts';

// Hardcoded fallbacks in case Firestore is unreachable
export const FALLBACK_MODELS: Record<ModelCategory, AIModel[]> = {
  text: [
    { id: 'gemini-3.6-flash', modelId: 'gemini-3.6-flash', name: '(20)Gemini 3.6 Flash', category: 'text_reasoning', isActive: true, order: 1, isDefaultLevel1: true, isDefaultLevel2: false },
    { id: 'gemini-3.5-flash', modelId: 'gemini-3.5-flash', name: '(20)Gemini 3.5 Flash', category: 'text_reasoning', isActive: true, order: 2, isDefaultLevel1: false, isDefaultLevel2: false },
    { id: 'gemini-3-flash-preview', modelId: 'gemini-3-flash-preview', name: '(20)Gemini 3 Flash Preview', category: 'text_reasoning', isActive: true, order: 3, isDefaultLevel1: false, isDefaultLevel2: false },
    { id: 'gemini-3.5-flash-lite', modelId: 'gemini-3.5-flash-lite', name: '(500)Gemini 3.5 Flash Lite', category: 'text_reasoning', isActive: true, order: 4, isDefaultLevel1: false, isDefaultLevel2: true },
    { id: 'gemini-3.1-flash-lite', modelId: 'gemini-3.1-flash-lite', name: '(500)Gemini 3.1 Flash Lite', category: 'text_reasoning', isActive: true, order: 5, isDefaultLevel1: false, isDefaultLevel2: false },
    { id: 'gemini-3.1-pro-preview', modelId: 'gemini-3.1-pro-preview', name: '(0)Gemini 3.1 Pro Preview', category: 'text_reasoning', isActive: true, order: 7, isDefaultLevel1: false, isDefaultLevel2: false },
    { id: 'gemini-flash-latest', modelId: 'gemini-flash-latest', name: 'Gemini Flash Latest', category: 'text_reasoning', isActive: true, order: 8, isDefaultLevel1: false, isDefaultLevel2: false },
  ],
  image: [
    { id: 'gemini-3-pro-image', modelId: 'gemini-3-pro-image', name: 'Nano Banana Pro (Gemini 3 Pro Image)', category: 'image_gen', isActive: true, order: 1, isDefaultLevel1: true, isDefaultLevel2: false },
    { id: 'gemini-3.1-flash-image', modelId: 'gemini-3.1-flash-image', name: 'Nano Banana 2 (Gemini 3.1 Flash Image)', category: 'image_gen', isActive: true, order: 2, isDefaultLevel1: false, isDefaultLevel2: true },
    { id: 'gemini-2.5-flash-image', modelId: 'gemini-2.5-flash-image', name: 'gemini-2.5-flash-image', category: 'image_gen', isActive: true, order: 6, isDefaultLevel1: false, isDefaultLevel2: false },
    { id: 'gemini-flash-image-latest', modelId: 'gemini-flash-image-latest', name: 'Gemini Flash Image Latest', category: 'image_gen', isActive: true, order: 7, isDefaultLevel1: false, isDefaultLevel2: false },
  ],
  video: [],
  tts: []
};

/**
 * Normalizes model categories into standard buckets: 'text', 'image', 'video', 'tts'
 */
function normalizeCategory(rawCat: string): ModelCategory {
  const cat = rawCat.toLowerCase();
  if (cat.includes('image') || cat.includes('vision') || cat.includes('ocr') || cat.includes('photo')) {
    return 'image';
  }
  if (cat.includes('video') || cat.includes('motion')) {
    return 'video';
  }
  if (cat.includes('tts') || cat.includes('speech') || cat.includes('audio') || cat.includes('voice')) {
    return 'tts';
  }
  return 'text'; // Default to text/chat/text_reasoning
}

/**
 * Fetches models from central Firestore collection "ai_models"
 */
export async function fetchCentralAIModels(): Promise<AIModel[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'ai_models'));
    const models: AIModel[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
      if (!isActive) return;

      const rawId = data.modelId || data.id || data.code || doc.id;
      const name = data.name || data.displayName || data.title || data.label || rawId;
      const rawCategory = String(data.category || data.type || data.group || 'text');
      const order = typeof data.order === 'number' ? data.order : 999;

      const isDefaultLevel1 = Boolean(
        data.isDefaultLevel1 ||
        data.defaultLevel1 ||
        data.isDefaultL1 ||
        data.level1Default ||
        data.defaultLevel === 1 ||
        (Array.isArray(data.defaultLevels) && data.defaultLevels.includes(1)) ||
        data.isDefault
      );

      const isDefaultLevel2 = Boolean(
        data.isDefaultLevel2 ||
        data.defaultLevel2 ||
        data.isDefaultL2 ||
        data.level2Default ||
        data.defaultLevel === 2 ||
        (Array.isArray(data.defaultLevels) && data.defaultLevels.includes(2))
      );

      models.push({
        id: doc.id,
        modelId: rawId,
        name: name,
        category: rawCategory,
        isActive: true,
        order: order,
        isDefaultLevel1,
        isDefaultLevel2
      });
    });

    // Sort by order ASC
    models.sort((a, b) => a.order - b.order);
    return models;
  } catch (error) {
    console.error('Error fetching central AI models from Firestore:', error);
    return [];
  }
}

/**
 * Filter models for a specific category ('text', 'image', etc.)
 */
export function filterModelsByCategory(models: AIModel[], category: ModelCategory): AIModel[] {
  const filtered = models.filter((m) => normalizeCategory(m.category) === category);
  
  // If Firestore didn't return models for this category, return fallback models
  if (filtered.length === 0) {
    return FALLBACK_MODELS[category] || [];
  }
  
  // Sort by order ASC
  filtered.sort((a, b) => a.order - b.order);
  return filtered;
}

/**
 * Determines default model for given importance level (Level 1 for this app)
 */
export function getDefaultModelForLevel(categoryModels: AIModel[], level: 1 | 2 = 1): string {
  if (categoryModels.length === 0) return '';

  const defaultModel = categoryModels.find((m) => 
    level === 1 ? m.isDefaultLevel1 : m.isDefaultLevel2
  );

  if (defaultModel) {
    return defaultModel.modelId;
  }

  // Fallback: pick the first model in sorted list
  return categoryModels[0].modelId;
}
