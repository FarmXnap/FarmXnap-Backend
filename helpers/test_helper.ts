import { ProductFactory } from '#database/factories/product_factory'
import { TestContext } from '@japa/runner/core'
import { cropTreatmentResult } from './crop_scan_helper.js'
import AgroDealerProfile from '#models/agro_dealer_profile'

export async function createProductsForAgroDealer(dealerId: string) {
  await ProductFactory.merge({
    agro_dealer_profile_id: dealerId,
    category: 'Fertilizer',
    name: 'Muriate of Potash',
    active_ingredient: 'Potassium',
    description:
      'Muriate of Potash (MOP) is a high-potassium fertilizer, typically containing 60% potash, used to strengthen plant roots, improve water retention, and increase fruit size and sweetness in crops like yam, cassava, and cocoa.',
    target_problems: 'Boosts root strength and fruit yield.',
  }).create()

  await ProductFactory.merge({
    agro_dealer_profile_id: dealerId,
    name: 'Mancozeb 80WP',
    active_ingredient: 'Mancozeb 80WP',
    category: 'Fungicide',
    description: 'A protective wettable powder for maize and other cereal crops...',
    target_problems: 'Maize leaf spot, blight, and rust',
  }).create()

  await ProductFactory.merge({
    agro_dealer_profile_id: dealerId,
    name: 'Copper Oxychloride 50WP',
    active_ingredient: 'Copper Oxychloride',
    description:
      'An inorganic copper-based powder that stays on the leaf surface to kill fungal and bacterial cells upon contact.',
    category: 'Fungicide',
    target_problems: 'Maize bacterial spots, black pod disease, and downy mildew.',
  }).create()

  await ProductFactory.merge({
    agro_dealer_profile_id: dealerId,
    name: 'Azoxystrobin',
    active_ingredient: 'Azoxystrobin',
    category: 'Fungicide',
    description: 'Systemic protection for maize leaves against aggressive fungal infections.',
    target_problems: 'Maize eyespot, rust, rice blast, and powdery mildew.',
  }).create()
}

export async function assertTreatmentResults({
  assert,
  treatments,
  verifiedDealer,
  unVerifiedDealer,
}: {
  assert: TestContext['assert']
  treatments: cropTreatmentResult[]
  verifiedDealer: AgroDealerProfile
  unVerifiedDealer: AgroDealerProfile
}) {
  // Assert likely number of responses (treatments)
  assert.isAtLeast(treatments.length, 2)
  assert.isAtMost(treatments.length, 3)

  for (const data of treatments) {
    assert.properties(data, [
      'id',
      'name',
      'active_ingredient',
      'price',
      'stock_quantity',
      'unit',
      'description',
      'category',
      'target_problems',
      'business_name',
      'business_address',
      'state',
      'bank_name',
      'bank_account_number',
      'bank_account_name',
      'phone_number',
      'rank',
      'links',
    ])

    // Assert that the products from the unverified dealer were not returned
    assert.equal(data.business_name, verifiedDealer.business_name)
    assert.notEqual(data.business_name, unVerifiedDealer.business_name)

    // Assert that the product in "Fertilizer" category was not returned
    assert.equal(data.category, 'Fungicide')
    assert.notEqual(data.category, 'Fertilizer')

    // Assert the links
    assert.containSubset(data.links, {
      create_order: {
        method: 'POST',
        href: `/api/v1/products/${data.id}/orders`,
      },
    })
  }

  // Assert that the highest match "Azoxystrobin" is returned first
  assert.equal(treatments[0].name, 'Azoxystrobin')
}
