
export enum ViewMode {
  SEARCH = 'SEARCH',
  NOTEBOOK = 'NOTEBOOK',
  FLASHCARDS = 'FLASHCARDS',
  STORY = 'STORY'
}

export interface TranslatedTerm {
  word: string;
  cn: string;
}

export interface Etymology {
  root: string;
  root_cn: string;
  pt_derivatives: TranslatedTerm[];
  en_derivatives: TranslatedTerm[];
}

export interface Example {
  pt: string;
  cn: string;
}

export interface Synonym {
  word: string;
  distinction: string; // Brief comparison in Chinese
}

export interface Conjugation {
  tense: string;
  forms: {
    eu: string;
    tu: string;
    ele: string;
    nos: string;
    vos: string;
    eles: string;
  };
}

export interface WordEntry {
  id: string;
  term: string;
  definition: string; // Chinese natural language explanation
  definition_en: string; // English natural language explanation
  ipa: string; // IPA pronunciation
  examples: Example[];
  synonyms: Synonym[]; 
  etymology: Etymology;
  conjugations?: Conjugation[]; // Optional: only for verbs
  casual_explanation: string; 
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StoryResponse {
  pt_story: string;
  cn_translation: string;
}

export interface FlashcardState {
  currentIndex: number;
  isFlipped: boolean;
}

// For the static verb list
export interface StaticVerb {
  word: string;
  cn: string;
  type: 'ar' | 'er' | 'ir';
  examples?: Example[];
}
