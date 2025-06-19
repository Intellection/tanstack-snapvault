import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function ProfilePage() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    email: '',
  })

  const { data: user, isLoading } = useQuery({
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
    onSuccess: (data) => {
      if (data) {
        setEditData({
          name: data.name,
          email: data.email,
        })
      }
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: { name: string; email: string }) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Update failed')
      }

      return response.json()
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user'], updatedUser)
      setIsEditing(false)
    },
  })

  const handleEdit = () => {
    setIsEditing(true)
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
    })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(editData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="loading" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card">
        <h2>Access Denied</h2>
        <p>Please log in to access your profile.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#2563eb' }}>Your Profile</h1>
          {!isEditing && (
            <button onClick={handleEdit} className="btn btn-primary">
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                value={editData.name}
                onChange={handleChange}
                disabled={updateProfileMutation.isPending}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={editData.email}
                onChange={handleChange}
                disabled={updateProfileMutation.isPending}
                required
              />
            </div>

            {updateProfileMutation.error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {updateProfileMutation.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <span className="loading" style={{ marginRight: '0.5rem' }}></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Full Name</label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                marginTop: '0.5rem'
              }}>
                {user.name}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Email Address</label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                marginTop: '0.5rem'
              }}>
                {user.email}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Member Since</label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                marginTop: '0.5rem'
              }}>
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#7c2d12' }}>Account Settings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => alert('Password change feature coming soon!')}
            style={{ justifyContent: 'flex-start' }}
          >
            🔐 Change Password
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => alert('Two-factor authentication coming soon!')}
            style={{ justifyContent: 'flex-start' }}
          >
            🛡️ Enable Two-Factor Authentication
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => alert('Data export feature coming soon!')}
            style={{ justifyContent: 'flex-start' }}
          >
            📤 Export My Data
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#dc2626' }}>Danger Zone</h3>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          These actions cannot be undone. Please be careful.
        </p>
        <button
          className="btn"
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none'
          }}
          onClick={() => {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
              alert('Account deletion feature coming soon!')
            }
          }}
        >
          🗑️ Delete Account
        </button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_layout/profile')({
  beforeLoad: async () => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    })
    if (!response.ok) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: ProfilePage,
})
