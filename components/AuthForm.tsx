'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthFormProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
}

export default function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const { login, register, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    if (mode === 'register') {
      if (!formData.username.trim()) {
        newErrors.push('Username is required');
      } else if (formData.username.length < 3) {
        newErrors.push('Username must be at least 3 characters');
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.push('Username can only contain letters, numbers, and underscores');
      }
    }

    if (!formData.email.trim()) {
      newErrors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('Please enter a valid email address');
    }

    if (!formData.password) {
      newErrors.push('Password is required');
    } else if (formData.password.length < 8) {
      newErrors.push('Password must be at least 8 characters');
    }

    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.push('Please confirm your password');
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.push('Passwords do not match');
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(formData.username, formData.email, formData.password);
      }
    } catch (error: any) {
      setErrors([error.message || 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-600">
          {mode === 'login'
            ? 'Sign in to access your vault'
            : 'Join SnapVault to start storing files securely'
          }
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 font-medium">
              {errors.length === 1 ? 'Error' : 'Errors'}
            </span>
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'register' && (
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter your username"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter your email"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter your password"
            disabled={isSubmitting}
          />
        </div>

        {mode === 'register' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Confirm your password"
              disabled={isSubmitting}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="spinner mr-2"></div>
              {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
            </>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button
            type="button"
            onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            disabled={isSubmitting}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
