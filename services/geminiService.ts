
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordEntry, StoryResponse } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Helpers ---
async function decodeAudioData(
  base64: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  if (bytes.length % 2 !== 0) {
      console.warn("Audio byte length is odd, truncating one byte.");
  }

  const dataInt16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const numChannels = 1;
  const sampleRate = 24000; 
  const frameCount = dataInt16.length;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
}

export const playTTS = async (text: string) => {
  if (!text || !text.trim()) return;

  try {
    const ai = getAI();
    // Using generateContent with specific TTS model and array structure
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [
        {
          role: "user",
          parts: [{ text: text.trim() }],
        }
      ],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
        throw new Error("No audio data received from API");
    }

    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(base64Audio, audioContext);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

// --- Dictionary Lookup ---
export const lookupTerm = async (term: string): Promise<WordEntry> => {
  const ai = getAI();
  
  const prompt = `
    User Input: "${term}"
    Target Audience: Simplified Chinese native speaker learning Portuguese.
    
    Task: Analyze the input and create a learning entry.

    LOGIC FLOW:
    1. **Language Detection**: 
       - If the user input is in CHINESE (e.g., "你好", "房子", "我爱吃面包"), translate it to the most common/natural BRAZILIAN PORTUGUESE equivalent first. 
       - Use that Portuguese translation as the "term" for the entry.
       - If input is already Portuguese, use it directly as "term".

    2. **Type Detection**:
       - Is the "term" a single word/short phrase OR a full sentence?
       - Set "is_sentence" to true or false.

    3. **OUTPUT REQUIREMENTS (If Word/Phrase)**:
       - definition: Chinese explanation.
       - definition_en: English explanation.
       - ipa: IPA pronunciation.
       - examples: 2 sentences (PT + CN).
       - synonyms: 3 related words with distinctions.
       - etymology: Latin root + PT/EN derivatives.
       - casual_explanation: Fun tip/culture.
       - conjugations: If it's a verb, provide tenses (Present, Past Perf, Imperfect, Imperative, Subj Pres, Future). Else empty.
       - sentence_analysis: null.

    4. **OUTPUT REQUIREMENTS (If Sentence)**:
       - term: The full Portuguese sentence.
       - definition: null.
       - ipa: null.
       - sentence_analysis: 
         - translation: Natural Chinese translation.
         - breakdown: Array of {word, meaning, role} for every word in the sentence.
         - grammar_notes: Explain the grammar structure, verb tenses used, etc.
         - cultural_context: Any cultural nuance, tone (formal/informal), or when to use this.
       - casual_explanation: Brief summary of the vibe.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: "The Portuguese term or sentence (translated from Chinese if necessary)" },
          is_sentence: { type: Type.BOOLEAN },
          
          // Word Fields
          definition: { type: Type.STRING, nullable: true },
          definition_en: { type: Type.STRING, nullable: true },
          ipa: { type: Type.STRING, nullable: true },
          examples: {
            type: Type.ARRAY,
            nullable: true,
            items: {
              type: Type.OBJECT,
              properties: {
                pt: { type: Type.STRING },
                cn: { type: Type.STRING },
              },
            },
          },
          synonyms: {
            type: Type.ARRAY,
            nullable: true,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                distinction: { type: Type.STRING }
              }
            }
          },
          conjugations: {
            type: Type.ARRAY,
            nullable: true,
            items: {
              type: Type.OBJECT,
              properties: {
                tense: { type: Type.STRING },
                forms: {
                  type: Type.OBJECT,
                  properties: {
                    eu: { type: Type.STRING },
                    tu: { type: Type.STRING },
                    ele: { type: Type.STRING },
                    nos: { type: Type.STRING },
                    vos: { type: Type.STRING },
                    eles: { type: Type.STRING }
                  }
                }
              }
            }
          },
          etymology: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              root: { type: Type.STRING },
              root_cn: { type: Type.STRING },
              pt_derivatives: { 
                type: Type.ARRAY, 
                items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, cn: { type: Type.STRING } } } 
              },
              en_derivatives: { 
                type: Type.ARRAY, 
                items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, cn: { type: Type.STRING } } } 
              },
            },
          },

          // Sentence Fields
          sentence_analysis: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
                translation: { type: Type.STRING },
                breakdown: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            role: { type: Type.STRING }
                        }
                    }
                },
                grammar_notes: { type: Type.STRING },
                cultural_context: { type: Type.STRING }
            }
          },

          casual_explanation: { type: Type.STRING },
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  
  const data = JSON.parse(text);
  
  return {
    id: Date.now().toString(),
    original_query: term, // Save what the user actually typed
    timestamp: Date.now(),
    ...data
  };
};

// --- Story Generation ---
export const generateStoryFromWords = async (words: string[]): Promise<StoryResponse> => {
  const ai = getAI();
  const prompt = `
    Create a short, funny story (max 100 words) in Brazilian Portuguese using the following list of words: ${words.join(', ')}.
    Then provide a Simplified Chinese translation.
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pt_story: { type: Type.STRING },
          cn_translation: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  const data = JSON.parse(text || "{}");
  
  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    words_used: words,
    ...data
  };
};

// --- Chat ---
export const chatAboutTerm = async (history: any[], message: string, currentTerm: WordEntry) => {
  const ai = getAI();
  
  let context = "";
  if (currentTerm.is_sentence && currentTerm.sentence_analysis) {
      context = `
        Sentence: "${currentTerm.term}"
        Translation: ${currentTerm.sentence_analysis.translation}
        Grammar: ${currentTerm.sentence_analysis.grammar_notes}
      `;
  } else {
      context = `
        Word: "${currentTerm.term}"
        Definition: ${currentTerm.definition}
      `;
  }

  // Prepend system instruction context about the current term if it's the start
  const systemInstruction = `
    You are a helpful Portuguese tutor. The user is currently looking at: 
    ${context}
    
    Answer the user's questions specifically about this. Keep answers concise, friendly, and encourage learning.
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
    history: history
  });

  const result = await chat.sendMessage({ message });
  return result.text;
};
