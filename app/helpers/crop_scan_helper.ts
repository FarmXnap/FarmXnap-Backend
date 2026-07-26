import CropScan from '#models/crop_scan'
import { AIDiagnosis } from '#services/ai_service'
import db from '@adonisjs/lucid/services/db'

export async function getCropTreatmentResults(aiDiagnosis: AIDiagnosis | CropScan) {
  const vectorSearch = `to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || p.target_problems)`
  const querySearch = `websearch_to_tsquery('english', :searchTerm)`
  // prefer websearch_to_tsquery to plainto_tsquery

  /**
   * @todo Improve rank to factor in location proximity
   */
  const result = await db.rawQuery<{ rows: cropTreatmentResult[] } | undefined>(
    `
      SELECT
        p.id,
        p.name,
        p.active_ingredient,
        p.price,
        p.stock_quantity,
        p.unit,
        p.description,
        p.target_problems,
        p.category,
        adp.business_name,
        adp.business_address,
        adp.state,
        adp.bank_name,
        adp.bank_account_number,
        adp.bank_account_name,
        u.phone_number,
        -- Ranking: full text search is weighted higher than fuzzy similarity
        (
          ts_rank(
            ${vectorSearch},
            ${querySearch}
          ) * 2
          + similarity(p.name, :searchTerm)
          -- Also boost active ingredient similarity
          + similarity(p.active_ingredient, :activeIngredient) * 3
        ) AS rank
      FROM products p
        JOIN agro_dealer_profiles adp ON p.agro_dealer_profile_id = adp.id
        JOIN users u on adp.user_id = u.id
      WHERE adp.is_verified = true
        AND p.category ILIKE :category
        AND (
          ${vectorSearch} @@ ${querySearch}
          OR p.name % :searchTerm
          OR p.target_problems % :searchTerm
          OR p.active_ingredient % :activeIngredient 
          OR p.active_ingredient ILIKE :activeIngredientWildcard
        )
      ORDER BY rank desc
      `,
    {
      category: aiDiagnosis.category,
      searchTerm: aiDiagnosis.search_term,
      activeIngredient: aiDiagnosis.active_ingredient,
      activeIngredientWildcard: `%${aiDiagnosis.active_ingredient}%`,
    }
  )

  return result
}

export type cropTreatmentResult = {
  id: string
  name: string
  active_ingredient: string
  price: string
  stock_quantity: number
  unit: string
  description: string
  category: string
  target_problems: string
  business_name: string
  business_address: string
  state: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  phone_number: string
  rank: number
  links: {
    create_order: {
      method: string
      href: string
    }
  }
}
