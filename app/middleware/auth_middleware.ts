import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  // redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    // await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })

    // Calling authenticateUsing without a loginRoute option forces Adonis to throw an E_UNAUTHORIZED_ACCESS error (401)
    await ctx.auth.authenticateUsing(options.guards)

    return next()
  }
}
