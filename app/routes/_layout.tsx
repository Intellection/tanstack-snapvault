import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSessionFromCookies } from '~/utils/auth'

function LayoutComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Get current user session
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      queryClient.setQueryData(['user'], null)
      router.navigate({ to: '/' })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <Link to="/" className="nav-brand">
              SnapVault
            </Link>

            <div className="nav-links">
              <Link
                to="/"
                className="nav-link"
                activeProps={{
                  className: 'nav-link active'
                }}
              >
                Home
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="nav-link"
                    activeProps={{
                      className: 'nav-link active'
                    }}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="nav-link"
                    activeProps={{
                      className: 'nav-link active'
                    }}
                  >
                    Profile
                  </Link>
                  <div className="nav-link">
                    Welcome, {user.name}!
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary"
                    disabled={isLoading}
                  >
                    {isLoading ? <span className="loading"></span> : 'Logout'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="nav-link"
                    activeProps={{
                      className: 'nav-link active'
                    }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})
