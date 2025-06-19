import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

function DashboardPage() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        return null
      }
      return response.json()
    },
    retry: false,
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="loading" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card">
        <h2>Access Denied</h2>
        <p>Please log in to access your dashboard.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h1 style={{ marginTop: 0, color: '#2563eb' }}>
          Welcome to your Dashboard, {user.name}! 📊
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          This is your personal dashboard where you can manage your account and view your activity.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3 style={{ marginTop: 0, color: '#059669' }}>Account Information</h3>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Name:</strong> {user.name}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Email:</strong> {user.email}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Member since:</strong>{' '}
            {new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#7c2d12' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <a href="/profile" className="btn btn-primary" style={{ textAlign: 'center' }}>
              Edit Profile
            </a>
            <button
              className="btn btn-secondary"
              onClick={() => alert('Feature coming soon!')}
            >
              Change Password
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => alert('Feature coming soon!')}
            >
              Export Data
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#7c2d12' }}>Recent Activity</h3>
          <div style={{ color: '#6b7280' }}>
            <div style={{ padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
              🔐 Logged in today
            </div>
            <div style={{ padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
              📝 Account created on {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div style={{ padding: '0.75rem 0' }}>
              ✨ Welcome to SnapVault!
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#7c2d12' }}>Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>1</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Sessions</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
                {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + 1}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Days Active</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Getting Started</h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Here are some things you can do to get the most out of SnapVault:
        </p>
        <ul style={{ paddingLeft: '1.5rem', color: '#6b7280' }}>
          <li style={{ marginBottom: '0.5rem' }}>Complete your profile information</li>
          <li style={{ marginBottom: '0.5rem' }}>Upload your first document or file</li>
          <li style={{ marginBottom: '0.5rem' }}>Set up two-factor authentication</li>
          <li style={{ marginBottom: '0.5rem' }}>Invite team members to collaborate</li>
          <li>Explore the settings to customize your experience</li>
        </ul>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_layout/dashboard')({
  beforeLoad: async ({ context, location }) => {
    const response = await fetch('/api/auth/me')
    if (!response.ok) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: DashboardPage,
})
