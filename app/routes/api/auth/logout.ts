import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { clearAuthCookie } from '~/utils/auth'

export const Route = createAPIFileRoute('/api/auth/logout')({
  POST: async ({ request }) => {
    try {
      // Clear the authentication cookie
      const clearCookie = clearAuthCookie()

      return json(
        { message: 'Logged out successfully' },
        {
          status: 200,
          headers: {
            'Set-Cookie': clearCookie,
          },
        }
      )
    } catch (error) {
      console.error('Logout error:', error)

      return json(
        { message: 'Logout failed. Please try again.' },
        { status: 500 }
      )
    }
  },
})
