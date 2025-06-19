import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

function HomePage() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      if (!response.ok) {
        return null
      }
      return response.json()
    },
    retry: false,
  })

  return (
    <div>
      <div className="card">
        <h1 style={{ marginTop: 0, color: '#2563eb' }}>
          Welcome to SnapVault
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '2rem' }}>
          A modern web application built with TanStack Router and session-based authentication.
        </p>

        {user ? (
          <div>
            <h2>Hello, {user.name}! 👋</h2>
            <p>You are successfully logged in. Here's what you can do:</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
              <Link to="/profile" className="btn btn-secondary">
                View Profile
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2>Get Started</h2>
            <p>Sign up for an account or log in to access your dashboard.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary">
                Create Account
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Features</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>🔐 Secure session-based authentication</li>
          <li>⚡ Built with TanStack Router for optimal performance</li>
          <li>🎨 Clean and responsive design</li>
          <li>🚀 Full-stack TypeScript</li>
          <li>🔄 Real-time state management with TanStack Query</li>
          <li>📦 Vite for fast development and building</li>
        </ul>
      </div>

      <div className="card">
        <h3>Technology Stack</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Frontend</h4>
            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
              <li>React 19</li>
              <li>TanStack Router</li>
              <li>TanStack Query</li>
              <li>TypeScript</li>
              <li>Vite</li>
            </ul>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Backend</h4>
            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
              <li>Express.js</li>
              <li>Node.js</li>
              <li>JWT Sessions</li>
              <li>bcryptjs</li>
              <li>CORS</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_layout/')({
  component: HomePage,
})
