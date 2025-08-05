import { TranslationRequest, EmotionType, APIResponse } from '../types';
import axios from 'axios';

export class TranslationService {
  private googleApiKey: string;
  private openaiApiKey: string;
  private animeTerminologyMap: Map<string, Map<string, string>>;

  constructor(googleApiKey: string, openaiApiKey: string) {
    this.googleApiKey = googleApiKey;
    this.openaiApiKey = openaiApiKey;
    this.animeTerminologyMap = new Map();
    this.initializeAnimeTerminology();
  }

  /**
   * Initialize anime-specific terminology mapping for cultural preservation
   */
  private initializeAnimeTerminology(): void {
    // Japanese honorifics and terms
    const japaneseTerms = new Map([
      ['senpai', 'senpai'], // Keep as-is for cultural authenticity
      ['kouhai', 'kouhai'],
      ['sensei', 'sensei'],
      ['chan', 'chan'],
      ['kun', 'kun'],
      ['sama', 'sama'],
      ['san', 'san'],
      ['onii-chan', 'big brother'],
      ['onee-chan', 'big sister'],
      ['otaku', 'otaku'],
      ['kawaii', 'cute'],
      ['sugoi', 'amazing'],
      ['baka', 'idiot'],
      ['tsundere', 'tsundere'],
      ['yandere', 'yandere'],
      ['nakama', 'friend/companion'],
      ['shinobi', 'ninja'],
      ['samurai', 'samurai'],
      ['dojo', 'dojo'],
      ['ki', 'spiritual energy'],
      ['chakra', 'chakra'],
      ['jutsu', 'technique'],
      ['senzu', 'senzu bean'],
      ['kamehameha', 'kamehameha']
    ]);

    this.animeTerminologyMap.set('ja', japaneseTerms);
  }

  /**
   * Translate dialogue with cultural context preservation
   */
  async translateDialogue(request: TranslationRequest): Promise<APIResponse<string>> {
    try {
      // First pass: Basic translation with context
      const basicTranslation = await this.getContextualTranslation(request);
      
      // Second pass: Cultural adaptation
      const culturallyAdapted = await this.applyCulturalAdaptation(
        basicTranslation,
        request.sourceLanguage,
        request.targetLanguage,
        request.characterName,
        request.emotion
      );

      // Third pass: Emotional tone adjustment
      const emotionallyAdjusted = await this.adjustEmotionalTone(
        culturallyAdapted,
        request.emotion || 'neutral',
        request.targetLanguage
      );

      return {
        success: true,
        data: emotionallyAdjusted,
        message: 'Translation completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
        message: 'Failed to translate dialogue'
      };
    }
  }

  /**
   * Get contextual translation using AI
   */
  private async getContextualTranslation(request: TranslationRequest): Promise<string> {
    const prompt = this.buildTranslationPrompt(request);
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert anime translator who preserves cultural context, character personality, and emotional tone. Provide natural, flowing dialogue that maintains the original meaning while being culturally appropriate for the target language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Build contextual translation prompt
   */
  private buildTranslationPrompt(request: TranslationRequest): string {
    let prompt = `Translate the following anime dialogue from ${request.sourceLanguage} to ${request.targetLanguage}:\n\n`;
    prompt += `Original text: "${request.text}"\n\n`;
    
    if (request.characterName) {
      prompt += `Character: ${request.characterName}\n`;
    }
    
    if (request.emotion) {
      prompt += `Emotion/Tone: ${request.emotion}\n`;
    }
    
    if (request.context) {
      prompt += `Scene context: ${request.context}\n`;
    }

    prompt += `\nRequirements:
- Preserve anime-specific terminology and honorifics where culturally appropriate
- Maintain character personality and speaking style
- Keep emotional tone and intensity
- Use natural, flowing dialogue that sounds authentic in ${request.targetLanguage}
- Avoid overly literal translations
- Consider cultural nuances and adapt accordingly

Provide only the translated text without explanations.`;

    return prompt;
  }

  /**
   * Apply cultural adaptation to preserve anime authenticity
   */
  private async applyCulturalAdaptation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    characterName?: string,
    emotion?: EmotionType
  ): Promise<string> {
    let adaptedText = text;

    // Preserve anime terminology
    if (sourceLanguage === 'ja' && this.animeTerminologyMap.has('ja')) {
      const terms = this.animeTerminologyMap.get('ja')!;
      terms.forEach((replacement, original) => {
        const regex = new RegExp(`\\b${original}\\b`, 'gi');
        adaptedText = adaptedText.replace(regex, replacement);
      });
    }

    // Apply language-specific adaptations
    adaptedText = this.applyLanguageSpecificAdaptations(adaptedText, targetLanguage, emotion);

    return adaptedText;
  }

  /**
   * Apply language-specific adaptations
   */
  private applyLanguageSpecificAdaptations(text: string, targetLanguage: string, emotion?: EmotionType): string {
    switch (targetLanguage.toLowerCase()) {
      case 'hindi':
      case 'hi':
        return this.applyHindiAdaptations(text, emotion);
      case 'tamil':
      case 'ta':
        return this.applyTamilAdaptations(text, emotion);
      case 'spanish':
      case 'es':
        return this.applySpanishAdaptations(text, emotion);
      case 'french':
      case 'fr':
        return this.applyFrenchAdaptations(text, emotion);
      default:
        return text;
    }
  }

  /**
   * Apply Hindi-specific adaptations
   */
  private applyHindiAdaptations(text: string, emotion?: EmotionType): string {
    let adapted = text;
    
    // Add appropriate Hindi expressions based on emotion
    if (emotion === 'surprised') {
      adapted = adapted.replace(/what\?!/gi, 'अरे वाह!');
      adapted = adapted.replace(/oh my god!/gi, 'हे भगवान!');
    } else if (emotion === 'angry') {
      adapted = adapted.replace(/damn it!/gi, 'अरे यार!');
    }

    return adapted;
  }

  /**
   * Apply Tamil-specific adaptations
   */
  private applyTamilAdaptations(text: string, emotion?: EmotionType): string {
    let adapted = text;
    
    // Add appropriate Tamil expressions
    if (emotion === 'excited') {
      adapted = adapted.replace(/awesome!/gi, 'அருமை!');
    }

    return adapted;
  }

  /**
   * Apply Spanish-specific adaptations
   */
  private applySpanishAdaptations(text: string, emotion?: EmotionType): string {
    let adapted = text;
    
    // Add appropriate Spanish expressions
    if (emotion === 'surprised') {
      adapted = adapted.replace(/what\?!/gi, '¡¿Qué?!');
    }

    return adapted;
  }

  /**
   * Apply French-specific adaptations
   */
  private applyFrenchAdaptations(text: string, emotion?: EmotionType): string {
    let adapted = text;
    
    // Add appropriate French expressions
    if (emotion === 'angry') {
      adapted = adapted.replace(/damn it!/gi, 'Zut alors!');
    }

    return adapted;
  }

  /**
   * Adjust emotional tone of translated text
   */
  private async adjustEmotionalTone(text: string, emotion: EmotionType, targetLanguage: string): Promise<string> {
    if (emotion === 'neutral') return text;

    const emotionPrompt = `Adjust the emotional tone of this ${targetLanguage} text to convey "${emotion}" emotion while maintaining the meaning:

Text: "${text}"

Make it sound more ${emotion} while keeping it natural and appropriate for anime dialogue. Provide only the adjusted text.`;

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in emotional expression in dialogue. Adjust the tone while preserving meaning.'
          },
          {
            role: 'user',
            content: emotionPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to adjust emotional tone:', error);
      return text; // Return original if adjustment fails
    }
  }

  /**
   * Batch translate multiple dialogue segments
   */
  async batchTranslate(requests: TranslationRequest[]): Promise<APIResponse<string[]>> {
    try {
      const translations = await Promise.all(
        requests.map(request => this.translateDialogue(request))
      );

      const results = translations.map(t => t.data || '');
      const errors = translations.filter(t => !t.success);

      return {
        success: errors.length === 0,
        data: results,
        message: errors.length > 0 ? `${errors.length} translations failed` : 'All translations completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch translation failed',
        message: 'Failed to process batch translation'
      };
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'english', 'hindi', 'tamil', 'spanish', 'french', 'german', 'italian',
      'portuguese', 'russian', 'chinese', 'korean', 'arabic', 'japanese'
    ];
  }

  /**
   * Detect language of input text
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await axios.post(`https://translation.googleapis.com/language/translate/v2/detect?key=${this.googleApiKey}`, {
        q: text
      });

      return response.data.data.detections[0][0].language;
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'unknown';
    }
  }
}