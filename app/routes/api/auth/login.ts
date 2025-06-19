import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { authenticateUser, createAuthCookie, validateEmail } from '~/utils/auth'

export const Route = createAPIFileRoute('/api/auth/login')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { email, password } = body

      // Validate input
      if (!email || !password) {
        return json(
          { message: 'Email and password are required' },
          { status: 400 }
        )
      }

      if (!validateEmail(email)) {
        return json(
          { message: 'Please provide a valid email address' },
          { status: 400 }
        )
      }

      // Authenticate user
      const user = await authenticateUser(email.toLowerCase().trim(), password)

      if (!user) {
        return json(
          { message: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Create session
      const authCookie = createAuthCookie({
        userId: user.id,
        email: user.email,
        name: user.name,
      })

      return json(user, {
        status: 200,
        headers: {
          'Set-Cookie': authCookie,
        },
      })
    } catch (error) {
      console.error('Login error:', error)

      return json(
        { message: 'Login failed. Please try again.' },
        { status: 500 }
      )
    }
  },
})
