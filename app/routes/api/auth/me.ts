import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { getSessionFromCookies, getUserById } from '~/utils/auth'

export const Route = createAPIFileRoute('/api/auth/me')({
  GET: async ({ request }) => {
    try {
      const cookieHeader = request.headers.get('cookie')
      const session = getSessionFromCookies(cookieHeader)

      if (!session) {
        return json(
          { message: 'Not authenticated' },
          { status: 401 }
        )
      }

      const user = getUserById(session.userId)

      if (!user) {
        return json(
          { message: 'User not found' },
          { status: 404 }
        )
      }

      return json(user, { status: 200 })
    } catch (error) {
      console.error('Get user error:', error)

      return json(
        { message: 'Failed to get user information' },
        { status: 500 }
      )
    }
  },
})
