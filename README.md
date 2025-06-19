# SnapVault 🔒

A lightweight, secure file upload and access API built with Next.js 15 and Tailwind CSS. Think of it as your private, temporary "vault" for screenshots, quick notes, and files you want to access easily — but only your own.

## Features ✨

- **Secure File Storage**: Upload files up to 50MB with automatic encryption and access tokens
- **User Authentication**: Secure user registration and login with JWT sessions
- **Temporary Links**: Files can auto-expire after specified time periods
- **File Management**: Upload, download, and manage your files through a clean interface
- **Image Optimization**: Automatic image compression and thumbnail generation
- **Drag & Drop Upload**: Modern file upload interface with progress tracking
- **Private by Default**: Each user can only access their own files
- **Multiple File Types**: Support for images, documents, archives, and more

## Tech Stack 🛠️

- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS 4
- **Backend**: Next.js API Routes, SQLite database
- **Authentication**: JWT with secure HTTP-only cookies
- **File Processing**: Sharp for image optimization
- **Security**: bcrypt for password hashing, secure file access tokens

## Quick Start 🚀

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tanstack-snapvault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and set your JWT secret:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Create required directories**
   ```bash
   mkdir -p data uploads
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage 📖

### Getting Started

1. **Register an Account**: Create a new account with username, email, and password
2. **Upload Files**: Drag and drop files or click to browse and upload
3. **Manage Files**: View, download, and share your uploaded files
4. **Set Expiration**: Choose when your files should automatically expire
5. **Share Securely**: Copy secure access links to share specific files

### File Upload Options

- **Public/Private**: Choose whether files can be accessed without authentication
- **Expiration**: Set files to expire after 1 hour, 24 hours, 1 week, or 1 month
- **Description**: Add optional descriptions to your files
- **Multiple Files**: Upload multiple files at once

### Supported File Types

- **Images**: JPEG, PNG, GIF, WebP, BMP, SVG
- **Documents**: PDF, Text, Markdown, JSON, CSV
- **Office**: Word, Excel, PowerPoint documents
- **Archives**: ZIP, RAR, 7Z

## API Documentation 🔌

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### File Management Endpoints

#### Upload Files
```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form data:
- file: (file) The file to upload
- description: (string, optional) File description
- isPublic: (boolean, optional) Whether file is publicly accessible
- expiresIn: (number, optional) Hours until expiration
```

#### Download File
```http
GET /api/files/{accessToken}
```

#### Get File Info
```http
GET /api/files/{accessToken}?info=true
```

#### List User Files
```http
GET /api/files/my
Authorization: Bearer <token>

Query parameters:
- limit: (number, optional) Maximum files to return (default: 50)
- offset: (number, optional) Number of files to skip (default: 0)
```

### Response Formats

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

## Security Features 🔐

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: Secure session management with HTTP-only cookies
- **File Access Tokens**: Unique, secure tokens for each file
- **CORS Configuration**: Configurable cross-origin resource sharing
- **File Validation**: Strict file type and size validation
- **SQL Injection Protection**: Parameterized database queries
- **XSS Protection**: Content Security Policy headers

## Configuration ⚙️

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | *(required)* |
| `MAX_FILE_SIZE` | Maximum file size in bytes | 52428800 (50MB) |
| `UPLOAD_DIR` | Directory for file storage | ./uploads |
| `SESSION_DURATION` | Session duration in milliseconds | 604800000 (7 days) |
| `NODE_ENV` | Environment mode | development |

### File Storage

Files are stored locally in the `uploads` directory by default. Each file gets:
- A unique filename with timestamp and UUID
- Secure access token for retrieval
- Metadata stored in SQLite database
- Optional automatic expiration

### Database Schema

The application uses SQLite with three main tables:
- `users`: User accounts and authentication
- `files`: File metadata and access tokens  
- `sessions`: Active user sessions

## Development 🛠️

### Project Structure

```
tanstack-snapvault/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── vault/             # Main application pages
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
├── contexts/              # React contexts
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication logic
│   ├── database.ts       # Database operations
│   └── file-utils.ts     # File handling utilities
├── uploads/               # File storage directory
└── data/                  # SQLite database
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management

The SQLite database is automatically created and initialized on first run. Tables and indexes are set up automatically.

### File Cleanup

Expired files are cleaned up automatically. You can also run cleanup manually:

```javascript
import { cleanupExpiredFiles } from '@/lib/file-utils';
await cleanupExpiredFiles();
```

## Deployment 🚀

### Production Setup

1. **Set production environment variables**
   ```env
   NODE_ENV=production
   JWT_SECRET=your-strong-production-secret
   DOMAIN=yourdomain.com
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    client_max_body_size 50M;
}
```

## Contributing 🤝

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Roadmap 🗺️

- [ ] Cloud storage integration (AWS S3, Google Cloud)
- [ ] Email notifications for file shares
- [ ] Advanced file preview capabilities
- [ ] API rate limiting and abuse prevention
- [ ] File sharing with password protection
- [ ] Bulk file operations
- [ ] File versioning system
- [ ] Analytics and usage statistics

## Troubleshooting 🔧

### Common Issues

**Database connection errors**
- Ensure the `data` directory exists and is writable
- Check file permissions on the SQLite database file

**File upload failures**
- Verify the `uploads` directory exists and is writable
- Check file size limits and allowed file types
- Ensure sufficient disk space is available

**Authentication issues**
- Verify JWT_SECRET is set in environment variables
- Check if cookies are being blocked by browser settings
- Ensure HTTPS is used in production for secure cookies

**Memory issues with large files**
- Consider reducing MAX_FILE_SIZE for resource-constrained environments
- Implement streaming uploads for very large files

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💬

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#troubleshooting-🔧)
2. Search existing [GitHub issues](../../issues)
3. Create a new issue with detailed information about your problem

---

**SnapVault** - Your secure, private file vault. Built with ❤️ using Next.js and Tailwind CSS.