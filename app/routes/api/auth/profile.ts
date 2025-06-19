import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { getSessionFromCookies, getUserById, validateEmail } from '~/utils/auth'

export const Route = createAPIFileRoute('/api/auth/profile')({
  PUT: async ({ request }) => {
    try {
      const cookieHeader = request.headers.get('cookie')
      const session = getSessionFromCookies(cookieHeader)

      if (!session) {
        return json(
          { message: 'Not authenticated' },
          { status: 401 }
        )
      }

      const body = await request.json()
      const { name, email } = body

      // Validate input
      if (!name || !email) {
        return json(
          { message: 'Name and email are required' },
          { status: 400 }
        )
      }

      if (!validateEmail(email)) {
        return json(
          { message: 'Please provide a valid email address' },
          { status: 400 }
        )
      }

      const user = getUserById(session.userId)

      if (!user) {
        return json(
          { message: 'User not found' },
          { status: 404 }
        )
      }

      // For this simple implementation, we'll just return the updated user
      // In a real app, you'd update the database here
      const updatedUser = {
        ...user,
        name: name.trim(),
        email: email.toLowerCase().trim(),
      }

      return json(updatedUser, { status: 200 })
    } catch (error) {
      console.error('Profile update error:', error)

      return json(
        { message: 'Profile update failed. Please try again.' },
        { status: 500 }
      )
    }
  },
})
