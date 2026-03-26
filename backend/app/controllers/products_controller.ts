import type { HttpContext } from '@adonisjs/core/http'
import { schema } from '@adonisjs/validator'
import Product, { productCategories } from '#models/product'
import router from '@adonisjs/core/services/router'
import AgroDealerProfile from '#models/agro_dealer_profile'
import { rules } from '#services/validator_rules'

export default class ProductsController {
  /**
   * List products by an agro-dealer.
   *
   * `GET /api/v1/products`
   */
  public async index({ response, auth }: HttpContext) {
    const user = auth.user!
    await user.load('agroDealerProfile') // Middleware ensures the user is an agro-dealer
    const unverified = await this.#checkVerification(user.agroDealerProfile)

    if (unverified) {
      return response.forbidden(unverified)
    }

    await user.agroDealerProfile.load('products', (productsQuery) => {
      productsQuery
        .select(['id', 'name', 'category', 'unit', 'price', 'stock_quantity', 'target_problems'])
        .orderBy('created_at', 'desc')
    })

    return response.ok({
      data: user.agroDealerProfile.products.map((product) => ({
        ...product.serialize(),
        links: {
          create: {
            method: 'POST',
            href: router.makeUrl('api.v1.products.store', [product.agro_dealer_profile_id]),
          },
        },
      })),
    })
  }

  /**
   * Create a product by an agro-dealer.
   *
   * `POST /api/v1/products`
   */
  public async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    await user.load('agroDealerProfile') // Middleware ensures the user is an agro-dealer
    const unverified = await this.#checkVerification(user.agroDealerProfile)

    if (unverified) {
      return response.forbidden(unverified)
    }

    const stringRules = [rules.trim(), rules.stripTags()]
    const numberRules = [rules.unsigned()]

    const payload = await request.validate({
      schema: schema.create({
        name: schema.string(stringRules),
        active_ingredient: schema.string(stringRules),
        price: schema.number(numberRules),
        stock_quantity: schema.number(numberRules),
        description: schema.string.nullable(stringRules),
        category: schema.enum(productCategories),
        unit: schema.string(stringRules),
        target_problems: schema.string.nullable(stringRules),
      }),
      messages: {
        'name.required': 'Product name is required.',
        'active_ingredient.required': 'Active Ingredient is required.',
        'price.required': 'Price is required.',
        'stock_quantity.required': 'Stock Quantity is required.',
        'stock_quantity.number': 'Stock Quantity must be a number.',
        'category.required': 'Category is required.',
        'category.enum': 'Category is invalid.',
        'unit.required': 'Unit is required.',
      },
    })

    const product = await Product.create({
      active_ingredient: payload.active_ingredient,
      agro_dealer_profile_id: user.agroDealerProfile!.id,
      category: payload.category,
      description: payload.description,
      name: payload.name,
      price: payload.price.toFixed(2),
      stock_quantity: payload.stock_quantity,
      target_problems: payload.target_problems,
      unit: payload.unit,
    })

    return response.created({
      message: 'Product created successfully.',
      data: {
        id: product.id,
        name: product.name,
      },
    })
  }

  async #checkVerification(agroDealerProfile: AgroDealerProfile) {
    if (!agroDealerProfile.is_verified) {
      return {
        error: 'You cannot perform this action until you complete verification.',
      }
    }
  }
}
