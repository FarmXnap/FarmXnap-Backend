import { AIDiagnosis } from '#services/ai_service'

/**
 * NB: This is a real sample response from the AI for the image `maize_with_spots.jpeg`.
 */
export const mockAiResponse: AIDiagnosis = {
  crop: 'Maize',
  disease: 'Eyespot',
  category: 'Fungicide',
  active_ingredient: 'Azoxystrobin',
  search_term: 'Maize small yellow leaf spots',
  instructions:
    'Apply a recommended fungicide containing active ingredients like Azoxystrobin to control the spread of the disease.',
}
