import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

export default class AdminAuthMiddleware {
  async handle({ request, response }: HttpContext, next: () => Promise<void>) {
    // Since there is no dedicated flow for admin signup for the hackathon demo, the client should ensure to provide the X-Admin-Secret in the header when calling endpoints for the admin dashboard.
    const secret = request.header('X-Admin-Secret')

    if (secret !== env.get('ADMIN_SECRET_KEY')) {
      return response.forbidden({ error: 'You are not authorized to view this.' })
    }

    await next()
  }
}
