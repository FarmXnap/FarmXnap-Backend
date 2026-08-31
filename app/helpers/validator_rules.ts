import { rules as adonisRules, validator } from '@adonisjs/validator'
import { Rule } from '@adonisjs/validator/types'
import { sanitisePhoneNumber } from './utils.js'

/**
 * 1. Define custom validator logic
 */
validator.rule('stripTags', (value, _, options) => {
  if (typeof value !== 'string') return
  const cleanValue = value.replace(/(<([^>]+)>)/gi, '').trim()

  // options.root[options.pointer] = cleanValue // IMPORTANT: This doesn't mutate anything.
  // Explicitly mutate the final validated output
  options.mutate(cleanValue)
})

validator.rule('sanitisePhoneNumber', (value, _, options) => {
  if (typeof value !== 'string') return

  options.mutate(sanitisePhoneNumber(value))
})

/**
 * 2. Export a 'rules' object that includes the original plus the custom rules
 */
export const rules = {
  ...adonisRules,
  stripTags: (): Rule => {
    return {
      name: 'stripTags',
      options: [],
    } as Rule
  },
  sanitisePhoneNumber: (): Rule => ({
    name: 'sanitisePhoneNumber',
    options: [],
  }),
}
