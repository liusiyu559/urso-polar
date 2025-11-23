
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

// New Interface for Sentence Analysis
export interface SentenceBreakdown {
  word: string;
  meaning: string;
  role: string; // e.g., Noun, Verb, Preposition
}

export interface SentenceAnalysis {
  translation: string;
  breakdown: SentenceBreakdown[];
  grammar_notes: string;
  cultural_context: string;
}

export interface WordEntry {
  id: string;
  term: string; // The Portuguese term/sentence
  original_query?: string; // What the user actually typed (e.g., if they typed in Chinese)
  is_sentence: boolean;
  
  // Word specific fields (optional if it's a sentence)
  definition?: string; 
  definition_en?: string; 
  ipa?: string; 
  examples?: Example[];
  synonyms?: Synonym[]; 
  etymology?: Etymology;
  conjugations?: Conjugation[]; 
  
  // Sentence specific fields (optional if it's a word)
  sentence_analysis?: SentenceAnalysis;

  casual_explanation: string; 
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StoryResponse {
  id: string; // Added ID for history
  timestamp: number; // Added timestamp
  words_used: string[]; // Track which words generated this
  pt_story: string;
  cn_translation: string;
}

export interface FlashcardState {
  currentIndex: number;
  isFlipped: boolean;
}

export interface StaticVerb {
  word: string;
  cn: string;
  type: 'ar' | 'er' | 'ir';
  examples?: Example[];
}
