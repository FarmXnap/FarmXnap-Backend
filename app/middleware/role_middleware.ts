import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, config: { role: string }) {
    const user = ctx.auth.user

    if (!user || user.role !== config.role) {
      return ctx.response.forbidden({
        error: 'You do not have permission to access this resource.',
      })
    }

    return next()
  }
}
