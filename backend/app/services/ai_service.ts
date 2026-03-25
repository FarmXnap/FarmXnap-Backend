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

    const prompt = `
    Act as a Nigerian Agronomist. Analyze this crop image.
    
    CRITICAL INSTRUCTIONS:
    1. If the image is NOT of a crop or plant, return:
       {"crop": "INVALID", "disease": "NONE", "category": "NONE", "active_ingredient": "NONE", "search_term": "NONE", "instructions": "This doesn't look like a crop. Please upload a clear photo of the affected plant leaves."}
    
    2. If the crop is HEALTHY, return:
       {"crop": "Name", "disease": "HEALTHY", "category": "NONE", "active_ingredient": "NONE", "search_term": "NONE", "instructions": "Your crop looks healthy! Keep up the good work with regular weeding and watering."}

    3. Otherwise, return ONLY this JSON object:
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

/**
 * NB: This is a real sample response from the AI for the image `maize_with_spots.jpeg`.
 */
export const mockAiResponseDiseasedCrop: AIDiagnosis = {
  crop: 'Maize',
  disease: 'Eyespot',
  category: 'Fungicide',
  active_ingredient: 'Azoxystrobin',
  search_term: 'Maize small yellow leaf spots',
  instructions:
    'Apply a recommended fungicide containing active ingredients like Azoxystrobin to control the spread of the disease.',
}

export const mockAiResponseNonCrop: AIDiagnosis = {
  crop: 'INVALID',
  disease: 'NONE',
  category: 'NONE',
  active_ingredient: 'NONE',
  search_term: 'NONE',
  instructions:
    "This doesn't look like a crop. Please upload a clear photo of the affected plant leaves.",
}

export const mockAiResponseHealthyCrop: AIDiagnosis = {
  crop: 'Maize',
  disease: 'HEALTHY',
  category: 'NONE',
  active_ingredient: 'NONE',
  search_term: 'NONE',
  instructions: 'Your crop looks healthy! Keep up the good work with regular weeding and watering.',
}
