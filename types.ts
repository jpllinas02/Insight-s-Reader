
export type Language = 'Español' | 'English' | 'Français' | 'Deutsch' | 'Italiano';

export interface AnalysisResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  visualDetails: {
    characters: string;
    gestures: string;
    environment: string;
    lighting: string;
    mood: string;
  };
  imagePrompt: string;
}

export type AppState = 'IDLE' | 'PASTING' | 'ANALYZING' | 'PAINTING' | 'RESULT' | 'ERROR';
