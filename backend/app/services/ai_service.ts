import { GoogleGenerativeAI } from '@google/generative-ai'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { productCategories } from '#models/product'

const genAI = new GoogleGenerativeAI(env.get('GEMINI_API_KEY'))

export default class AiService {
  public static async diagnose(imageBuffer: Buffer, mimeType: string) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    })

    const prompt = `
    Act as a Nigerian Agronomist. Analyze this crop image.
    Return ONLY a JSON object:
    {
      "crop": "Name of crop",
      "disease": "Specific disease name",
      "category": "${productCategories}.join(' OR ')",
      "active_ingredient": "The main chemical needed",
      "search_term": "Two words for database searching",
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
