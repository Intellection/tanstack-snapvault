# TanStack SnapVault

A modern full-stack web application built with TanStack Start featuring session-based authentication, TypeScript, and a clean, responsive design.

## 🚀 Features

- **🔐 Session-based Authentication** - Secure JWT-based sessions with HTTP-only cookies
- **⚡ TanStack Start** - Modern full-stack React framework with SSR/SSG support
- **📱 Responsive Design** - Clean, mobile-first UI with custom CSS
- **🎯 Type Safety** - Full TypeScript support throughout the application
- **🔄 State Management** - TanStack Query for server state management
- **🛣️ File-based Routing** - TanStack Router with automatic route generation
- **🔒 Protected Routes** - Route-level authentication guards
- **📊 Developer Tools** - Built-in dev tools for routing and queries

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **Yarn** (version 4.x)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd tanstack-snapvault
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and update the `JWT_SECRET` with a secure random string:

   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   PORT=3000
   ```

4. **Start the development server**

   ```bash
   yarn dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to see the application.

## 📁 Project Structure

```
tanstack-snapvault/
├── app/                          # Application source code
│   ├── routes/                   # File-based routing
│   │   ├── __root.tsx           # Root layout component
│   │   ├── _layout.tsx          # Main layout with navigation
│   │   ├── _layout/             # Layout child routes
│   │   │   ├── index.tsx        # Home page
│   │   │   ├── login.tsx        # Login page
│   │   │   ├── register.tsx     # Registration page
│   │   │   ├── dashboard.tsx    # Protected dashboard
│   │   │   └── profile.tsx      # Protected profile page
│   │   └── api/                 # API routes
│   │       └── auth/            # Authentication endpoints
│   │           ├── register.ts  # User registration
│   │           ├── login.ts     # User login
│   │           ├── logout.ts    # User logout
│   │           ├── me.ts        # Current user info
│   │           └── profile.ts   # Profile updates
│   ├── utils/                   # Utility functions
│   │   └── auth.ts             # Authentication helpers
│   ├── components/             # Reusable components
│   ├── lib/                    # Library configurations
│   ├── client.tsx              # Client entry point
│   ├── ssr.tsx                 # Server entry point
│   ├── router.tsx              # Router configuration
│   └── routeTree.gen.ts        # Generated route tree
├── public/                     # Static assets
├── .env.example               # Environment variables template
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
└── README.md                  # Project documentation
```

## 🔧 Available Scripts

- **`yarn dev`** - Start the development server with hot reloading
- **`yarn build`** - Build the application for production
- **`yarn start`** - Start the production server
- **`yarn lint`** - Run TypeScript type checking

## 🔐 Authentication Flow

The application implements a secure session-based authentication system:

1. **Registration/Login** - Users can create accounts or sign in with email/password
2. **JWT Sessions** - Upon successful authentication, a JWT token is created
3. **HTTP-only Cookies** - The JWT is stored in secure, HTTP-only cookies
4. **Route Protection** - Protected routes automatically redirect unauthenticated users
5. **Session Persistence** - Sessions persist across browser refreshes
6. **Secure Logout** - Logout clears the session cookie

### Authentication API Endpoints

- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate user credentials
- `POST /api/auth/logout` - Clear user session
- `GET /api/auth/me` - Get current user information
- `PUT /api/auth/profile` - Update user profile

## 🛣️ Routing

The application uses TanStack Router with file-based routing:

### Public Routes

- `/` - Home page
- `/login` - User login
- `/register` - User registration

### Protected Routes

- `/dashboard` - User dashboard (requires authentication)
- `/profile` - User profile management (requires authentication)

## 🎨 Styling

The application uses custom CSS with a modern design system:

- **Responsive Design** - Mobile-first approach with flexible layouts
- **Color Scheme** - Professional blue and gray palette
- **Typography** - System font stack for optimal performance
- **Components** - Reusable CSS classes for forms, buttons, and cards
- **Animations** - Smooth transitions and loading states

## 🔒 Security Features

- **Password Hashing** - bcryptjs for secure password storage
- **JWT Tokens** - Signed tokens with expiration
- **HTTP-only Cookies** - Prevents XSS attacks
- **CSRF Protection** - SameSite cookie configuration
- **Input Validation** - Server-side validation for all inputs
- **Type Safety** - TypeScript prevents common vulnerabilities

## 🚀 Deployment

### Building for Production

1. **Build the application**

   ```bash
   yarn build
   ```

2. **Start the production server**
   ```bash
   yarn start
   ```

### Environment Variables for Production

Ensure you set the following environment variables in production:

```env
JWT_SECRET=your-secure-production-jwt-secret
NODE_ENV=production
PORT=3000
```

### Recommended Hosting Platforms

- **Vercel** - Optimal for TanStack Start applications
- **Netlify** - Great for static site generation
- **Railway** - Simple container deployment
- **Docker** - For containerized deployments

## 🔄 Development Workflow

1. **Create a new feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test locally with `yarn dev`

3. **Run type checking**

   ```bash
   yarn lint
   ```

4. **Build and test the production version**

   ```bash
   yarn build
   yarn start
   ```

5. **Commit your changes** and create a pull request

## 📦 Technology Stack

### Frontend

- **React 19** - Latest React with concurrent features
- **TanStack Router** - Type-safe routing with file-based structure
- **TanStack Query** - Powerful data fetching and caching
- **TypeScript** - Static type checking for better development experience

### Backend

- **TanStack Start** - Full-stack React framework
- **Node.js** - JavaScript runtime for server-side logic
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing for security

### Development Tools

- **Vite** - Fast build tool and development server
- **TanStack Router Devtools** - Route debugging and inspection
- **TanStack Query Devtools** - Query state visualization
- **TypeScript** - Enhanced IDE support and error catching

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Route devtools may show warnings in development - this is expected with the current TanStack Router version
- Some peer dependency warnings during installation - these don't affect functionality

## 🔮 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Email verification system
- [ ] Two-factor authentication
- [ ] Social OAuth providers (Google, GitHub)
- [ ] File upload capabilities
- [ ] Real-time notifications
- [ ] Dark mode support
- [ ] Internationalization (i18n)
- [ ] API rate limiting
- [ ] Advanced user roles and permissions

## 📞 Support

If you encounter any issues or have questions:

1. Check the [existing issues](../../issues)
2. Create a new issue with a detailed description
3. Include steps to reproduce any bugs
4. Provide your environment details (Node.js version, OS, etc.)

---

Built with ❤️ using TanStack Start
