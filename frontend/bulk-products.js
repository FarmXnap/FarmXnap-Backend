#!/usr/bin/env node
// ─── FarmXnap Bulk Product Creator ─────────────────────────────────────────
// Usage:
//   1. Set your dealer token below (or pass as env var: TOKEN=xxx node bulk-products.js)
//   2. Edit PRODUCTS array with your products
//   3. Run: node scripts/bulk-products.js
//
// Get your token: log in to FarmXnap, open DevTools → Application → Local Storage
// → farmxnap-auth → state → token
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://farmxnap.onrender.com/api/v1'

// ── SET YOUR TOKEN HERE (or use: TOKEN=your_token node scripts/bulk-products.js) ──
const TOKEN = 'oat_NjY.bkM3SG9Ia2syUTNKWnk1TkxMNzZHM0k4c3NFTjZ2V0pjbjNidDlHXzI1OTE2NTMyMzk'

// ── YOUR PRODUCTS ─────────────────────────────────────────────────────────────
// Fields:
//   name             (required)  full commercial name e.g. "Mancozeb 80WP"
//   active_ingredient(required)  exact chemical name  e.g. "Mancozeb"
//   price            (required)  number in Naira      e.g. 3500
//   stock_quantity   (required)  how many units        e.g. 50
//   category         (required)  Fungicide | Insecticide | Herbicide | Fertilizer | Other
//   unit             (required)  e.g. "1 kg" | "500ml" | "250g" | "1L" | "50 kg"
//   target_problems  (optional)  diseases treated, comma-separated
//   description      (optional)  dosage, mixing instructions, safety tips

const PRODUCTS = [
  {
    name:              'Imidacloprid 200SL',
    active_ingredient: 'Imidacloprid',
    price:             4200,
    stock_quantity:    30,
    category:          'Insecticide',
    unit:              '500 ml',
    target_problems:   'Whitefly, Aphids, Thrips, Cassava mosaic disease vector',
    description:       'Systemic insecticide. Dilute 5ml per 10L. Controls sucking insects and mosaic disease vectors.',
  },
  {
    name:              'Copper Oxychloride 50WP',
    active_ingredient: 'Copper Oxychloride',
    price:             2800,
    stock_quantity:    40,
    category:          'Fungicide',
    unit:              '500 g',
    target_problems:   'Early blight, Late blight, Downy mildew, Black sigatoka',
    description:       'Contact fungicide for tomatoes, yam and pepper. Mix 30g per 10L. Do not apply in hot sun.',
  },
  {
    name:              'Carbendazim 50WP',
    active_ingredient: 'Carbendazim',
    price:             1900,
    stock_quantity:    60,
    category:          'Fungicide',
    unit:              '250 g',
    target_problems:   'Anthracnose, Wilt, Root rot, Yam anthracnose',
    description:       'Systemic fungicide for soil-borne and leaf diseases. Mix 15g per 10L of water.',
  },
  {
    name:              'Tricyclazole 75WP',
    active_ingredient: 'Tricyclazole',
    price:             2200,
    stock_quantity:    25,
    category:          'Fungicide',
    unit:              '100 g',
    target_problems:   'Rice blast, Neck rot',
    description:       'Specific for rice blast. Apply at booting stage. Mix 10g per 10L. One application lasts 3-4 weeks.',
  },
  {
    name:              'Acetamiprid 20SP',
    active_ingredient: 'Acetamiprid',
    price:             1500,
    stock_quantity:    45,
    category:          'Insecticide',
    unit:              '100 g',
    target_problems:   'Aphids, Whitefly, Thrips, Pepper mosaic virus vector',
    description:       'Systemic insecticide for pepper, tomato and leafy vegetables. Mix 5g per 10L.',
  },
  {
    name:              'Glyphosate 480SL',
    active_ingredient: 'Glyphosate',
    price:             2500,
    stock_quantity:    35,
    category:          'Herbicide',
    unit:              '1 L',
    target_problems:   'Broadleaf weeds, Grasses, Bush clearing',
    description:       'Non-selective herbicide for pre-planting weed control. Mix 50ml per 10L. Do not spray on crops.',
  },
  {
    name:              'NPK 15-15-15 Fertilizer',
    active_ingredient: 'Nitrogen, Phosphorus, Potassium',
    price:             8500,
    stock_quantity:    20,
    category:          'Fertilizer',
    unit:              '50 kg',
    target_problems:   'Nutrient deficiency, Poor yield',
    description:       'Balanced fertilizer for all crops. Apply 200kg per hectare at planting and 6 weeks after.',
  },
  {
    name:              'Azoxystrobin 25SC',
    active_ingredient: 'Azoxystrobin',
    price:             5200,
    stock_quantity:    20,
    category:          'Fungicide',
    unit:              '1 L',
    target_problems:   'Maize eyespot, Rust, Rice blast, Powdery mildew, Early blight',
    description:       'Systemic fungicide with both protective and curative action. Mix 10ml per 10L. Safe for most crops.',
  },
  {
    name:              'Lambda-Cyhalothrin 2.5EC',
    active_ingredient: 'Lambda-Cyhalothrin',
    price:             1800,
    stock_quantity:    55,
    category:          'Insecticide',
    unit:              '100 ml',
    target_problems:   'Armyworm, Stem borer, Pod borer, Caterpillar, Grasshopper',
    description:       'Broad-spectrum contact insecticide. Mix 10ml per 10L. Apply in the evening for best results.',
  },
]

// ── Script logic ──────────────────────────────────────────────────────────────
async function createProduct(product) {
  const res = await fetch(`${BASE_URL}/products`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(product),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json.error
      || (json.errors ? (Array.isArray(json.errors) ? json.errors.join(', ') : json.errors) : null)
      || `HTTP ${res.status}`
    throw new Error(err)
  }
  return json
}

async function run() {
  if (!TOKEN || TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
    console.error('\n❌  No token found. Two ways to set it:\n')
    console.error('    Option 1 — edit this file:')
    console.error('      const TOKEN = "oat_xxx...your_token_here"\n')
    console.error('    Option 2 — pass via command line:')
    console.error('      TOKEN=oat_xxx node scripts/bulk-products.js\n')
    console.error('    How to get your token:')
    console.error('      Open FarmXnap → DevTools (F12) → Application')
    console.error('      → Local Storage → farmxnap-auth → state → token\n')
    process.exit(1)
  }

  console.log('\n🌾  FarmXnap Bulk Product Creator')
  console.log(`📡  ${BASE_URL}`)
  console.log(`📦  ${PRODUCTS.length} products to create\n`)
  console.log('─'.repeat(55))

  let success = 0
  let failed  = 0
  const errors = []

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i]
    const prefix = `[${String(i + 1).padStart(2)}/${PRODUCTS.length}]`
    process.stdout.write(`${prefix} ${p.name.padEnd(30)} `)
    try {
      const res = await createProduct(p)
      console.log(`✅  id: ${res.data?.id || '—'}`)
      success++
    } catch (e) {
      console.log(`❌  ${e.message}`)
      errors.push({ name: p.name, error: e.message })
      failed++
    }
    // 400ms delay between requests to avoid rate limiting
    if (i < PRODUCTS.length - 1) await new Promise(r => setTimeout(r, 400))
  }

  console.log('─'.repeat(55))
  console.log(`\n✅  Created: ${success}`)
  if (failed > 0) {
    console.log(`❌  Failed:  ${failed}`)
    console.log('\nFailed products:')
    errors.forEach(e => console.log(`   • ${e.name}: ${e.error}`))
  }
  console.log('\nDone! Open your dealer dashboard to see your products. 🎉\n')
}

run().catch(e => {
  console.error('\n💥 Unexpected error:', e.message)
  process.exit(1)
})