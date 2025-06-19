import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { createUser, createAuthCookie, validateEmail, validatePassword } from '~/utils/auth'

export const Route = createAPIFileRoute('/api/auth/register')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { name, email, password } = body

      // Validate input
      if (!name || !email || !password) {
        return json(
          { message: 'Name, email, and password are required' },
          { status: 400 }
        )
      }

      if (!validateEmail(email)) {
        return json(
          { message: 'Please provide a valid email address' },
          { status: 400 }
        )
      }

      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        return json(
          { message: passwordValidation.message },
          { status: 400 }
        )
      }

      // Create user
      const user = await createUser(email.toLowerCase().trim(), password, name.trim())

      // Create session
      const authCookie = createAuthCookie({
        userId: user.id,
        email: user.email,
        name: user.name,
      })

      return json(user, {
        status: 201,
        headers: {
          'Set-Cookie': authCookie,
        },
      })
    } catch (error) {
      console.error('Registration error:', error)

      if (error instanceof Error && error.message === 'User already exists') {
        return json(
          { message: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      return json(
        { message: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }
  },
})
