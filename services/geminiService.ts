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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text.trim() }],
      },
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
        const returnedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        console.error("TTS Response missing audio data. Returned text:", returnedText);
        console.debug("Full Response:", JSON.stringify(response, null, 2));
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
    User Input: "${term}" (Brazilian Portuguese).
    Target Audience: Simplified Chinese native speaker learning Portuguese.
    
    Task: Create a comprehensive dictionary entry.
    
    Requirements:
    1. Definition: Natural language explanation in Simplified Chinese (Core Meaning).
    2. Definition_EN: Natural language explanation in English (Brief).
    3. IPA: International Phonetic Alphabet representation.
    4. Examples: 2 sentences in Portuguese with Chinese translation.
    5. Synonyms: List 3 related words or synonyms and briefly explain the distinction/nuance in Chinese.
    6. Etymology: Identify Latin root (provide root and its Chinese meaning), list Portuguese derivatives (up to 3, with Chinese meaning) and English derivatives (up to 3, with Chinese meaning).
    7. Casual Explanation: A short, fun, "Tip" style paragraph (in Chinese). Mention cultural context, usage tone, or memory hooks.
    
    IMPORTANT - VERB LOGIC:
    If the input term is a verb, or contains a main verb:
    Provide conjugations for these tenses: 
    - Presente do Indicativo (Present)
    - Pretérito Perfeito (Past Perfect)
    - Pretérito Imperfeito (Imperfect)
    - Imperativo (Imperative - use Affirmative)
    - Presente do Subjuntivo (Subjunctive Present)
    - Futuro do Presente (Simple Future)
    
    For each tense, provide the forms for: eu, tu, ele/você, nós, vós, eles/vocês.
    If it is NOT a verb, leave the 'conjugations' field empty array.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          definition_en: { type: Type.STRING },
          ipa: { type: Type.STRING },
          examples: {
            type: Type.ARRAY,
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
            properties: {
              root: { type: Type.STRING },
              root_cn: { type: Type.STRING },
              pt_derivatives: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    cn: { type: Type.STRING }
                  }
                } 
              },
              en_derivatives: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    cn: { type: Type.STRING }
                  }
                } 
              },
            },
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
    term,
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
  return JSON.parse(text || "{}");
};

// --- Chat ---
export const chatAboutTerm = async (history: any[], message: string, currentTerm: WordEntry) => {
  const ai = getAI();
  
  // Prepend system instruction context about the current term if it's the start
  const systemInstruction = `
    You are a helpful Portuguese tutor. The user is currently looking at the dictionary entry for: "${currentTerm.term}".
    Definition (CN): ${currentTerm.definition}.
    Definition (EN): ${currentTerm.definition_en}.
    Casual note: ${currentTerm.casual_explanation}.
    
    Answer the user's questions specifically about this word/phrase. Keep answers concise, friendly, and encourage learning.
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
    history: history
  });

  const result = await chat.sendMessage({ message });
  return result.text;
};