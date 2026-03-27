import { schema } from '@adonisjs/validator'
import { HttpContext } from '@adonisjs/core/http'
import { rules } from '#services/validator_rules'
import { productCategories } from '#models/product'

const stringRules = [rules.trim(), rules.stripTags()]
const numberRules = [rules.unsigned()]

export default class ProductValidator {
  constructor(protected ctx: HttpContext) {}

  public schema = schema.create({
    name: schema.string(stringRules),
    active_ingredient: schema.string(stringRules),
    price: schema.number(numberRules),
    stock_quantity: schema.number(numberRules),
    description: schema.string.nullable(stringRules),
    category: schema.enum(productCategories),
    unit: schema.string(stringRules),
    target_problems: schema.string.nullable(stringRules),
  })

  public messages = {
    'name.required': 'Product name is required.',
    'active_ingredient.required': 'Active Ingredient is required.',
    'price.required': 'Price is required.',
    'stock_quantity.required': 'Stock Quantity is required.',
    'stock_quantity.number': 'Stock Quantity must be a number.',
    'category.required': 'Category is required.',
    'category.enum': 'Category is invalid.',
    'unit.required': 'Unit is required.',
  }
}
