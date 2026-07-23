import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AIModel,
  ModelCategory,
  fetchCentralAIModels,
  filterModelsByCategory,
  getDefaultModelForLevel,
  FALLBACK_MODELS
} from '../services/aiModelService';

export const APP_IMPORTANCE_LEVEL: 1 | 2 = 1; // Requirement 2: Level 1 for this app

interface AIModelContextType {
  loading: boolean;
  allModels: AIModel[];
  textModels: AIModel[];
  imageModels: AIModel[];
  selectedTextModel: string;
  setSelectedTextModel: (modelId: string) => void;
  selectedImageModel: string;
  setSelectedImageModel: (modelId: string) => void;
  defaultTextModel: string;
  defaultImageModel: string;
}

const AIModelContext = createContext<AIModelContextType | undefined>(undefined);

export const AIModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allModels, setAllModels] = useState<AIModel[]>([]);
  
  const [textModels, setTextModels] = useState<AIModel[]>(FALLBACK_MODELS.text);
  const [imageModels, setImageModels] = useState<AIModel[]>(FALLBACK_MODELS.image);

  // Initial defaults for Level 1
  const initialDefaultText = getDefaultModelForLevel(FALLBACK_MODELS.text, APP_IMPORTANCE_LEVEL);
  const initialDefaultImage = getDefaultModelForLevel(FALLBACK_MODELS.image, APP_IMPORTANCE_LEVEL);

  const [defaultTextModel, setDefaultTextModel] = useState<string>(initialDefaultText);
  const [defaultImageModel, setDefaultImageModel] = useState<string>(initialDefaultImage);

  // Selected models for current session (reset to defaults on page refresh)
  const [selectedTextModel, setSelectedTextModel] = useState<string>(initialDefaultText);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(initialDefaultImage);

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      setLoading(true);
      const fetched = await fetchCentralAIModels();

      if (!isMounted) return;

      if (fetched.length > 0) {
        setAllModels(fetched);

        const filteredText = filterModelsByCategory(fetched, 'text');
        const filteredImage = filterModelsByCategory(fetched, 'image');

        setTextModels(filteredText);
        setImageModels(filteredImage);

        const defText = getDefaultModelForLevel(filteredText, APP_IMPORTANCE_LEVEL);
        const defImage = getDefaultModelForLevel(filteredImage, APP_IMPORTANCE_LEVEL);

        setDefaultTextModel(defText);
        setDefaultImageModel(defImage);

        // Always reset selected model to Level 1 Default upon page refresh!
        setSelectedTextModel(defText);
        setSelectedImageModel(defImage);
      } else {
        // Fallback mode if Firestore query is empty or fails
        const fallbackText = FALLBACK_MODELS.text;
        const fallbackImage = FALLBACK_MODELS.image;

        setTextModels(fallbackText);
        setImageModels(fallbackImage);

        const defText = getDefaultModelForLevel(fallbackText, APP_IMPORTANCE_LEVEL);
        const defImage = getDefaultModelForLevel(fallbackImage, APP_IMPORTANCE_LEVEL);

        setDefaultTextModel(defText);
        setDefaultImageModel(defImage);

        setSelectedTextModel(defText);
        setSelectedImageModel(defImage);
      }

      setLoading(false);
    }

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AIModelContext.Provider
      value={{
        loading,
        allModels,
        textModels,
        imageModels,
        selectedTextModel,
        setSelectedTextModel,
        selectedImageModel,
        setSelectedImageModel,
        defaultTextModel,
        defaultImageModel
      }}
    >
      {children}
    </AIModelContext.Provider>
  );
};

export const useAIModels = (): AIModelContextType => {
  const context = useContext(AIModelContext);
  if (!context) {
    throw new Error('useAIModels must be used within an AIModelProvider');
  }
  return context;
};
