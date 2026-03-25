import { GoogleGenerativeAI } from '@google/generative-ai'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { productCategories } from '#models/product'

const genAI = new GoogleGenerativeAI(env.get('GEMINI_API_KEY'))

export default class AiService {
  public static async diagnose(imageBuffer: Buffer, mimeType: string): Promise<AIDiagnosis> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    })

    /**
     * @todo: Validate prompt
     */
    const prompt = `
    Act as a Nigerian Agronomist. Analyze this crop image.
    Return ONLY a JSON object:
    {
      "crop": "Name of crop",
      "disease": "Specific disease name",
      "category": "Pick the SINGLE most relevant category from: ${productCategories.join(', ')}",
      "active_ingredient": "The main chemical needed",
      "search_term": "A 3-5 word search phrase containing the crop name and primary symptoms",
      "instructions": "Simple 1-sentence step for a Nigerian farmer"
    }
  `

    try {
      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType,
          },
        },
        prompt,
      ])

      const text = result.response.text()

      // Clean the string in case Gemini wraps it in markdown ```json blocks
      const cleanedJson = text.replace(/```json|```/g, '').trim()

      return JSON.parse(cleanedJson)
    } catch (error) {
      logger.error({ error }, 'AI Error ')
      throw new Error('Diagnosis service currently unavailable.')
    }
  }
}

export type AIDiagnosis = {
  crop: string
  disease: string
  category: string
  active_ingredient: string
  search_term: string
  instructions: string
}
