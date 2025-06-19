#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 SnapVault Development Setup');
console.log('==============================\n');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function checkNodeVersion() {
  logStep('1/7', 'Checking Node.js version...');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

  if (majorVersion < 18) {
    logError(`Node.js version ${nodeVersion} is not supported. Please install Node.js 18 or higher.`);
    process.exit(1);
  }

  logSuccess(`Node.js version ${nodeVersion} is supported`);
}

function createDirectories() {
  logStep('2/7', 'Creating required directories...');

  const directories = ['data', 'uploads', 'uploads/thumbnails'];

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logSuccess(`Created directory: ${dir}`);
    } else {
      log(`Directory already exists: ${dir}`, 'yellow');
    }
  });
}

function setupEnvironment() {
  logStep('3/7', 'Setting up environment variables...');

  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      // Copy .env.example to .env.local
      const envExample = fs.readFileSync(envExamplePath, 'utf8');

      // Generate a random JWT secret
      const jwtSecret = require('crypto').randomBytes(64).toString('hex');
      const envContent = envExample.replace(
        'JWT_SECRET=your-super-secret-jwt-key-change-this-in-production',
        `JWT_SECRET=${jwtSecret}`
      );

      fs.writeFileSync(envPath, envContent);
      logSuccess('Created .env.local with generated JWT secret');
    } else {
      // Create basic .env.local
      const jwtSecret = require('crypto').randomBytes(64).toString('hex');
      const basicEnv = `# SnapVault Environment Configuration
JWT_SECRET=${jwtSecret}
NODE_ENV=development
PORT=3000
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
SESSION_DURATION=604800000
`;

      fs.writeFileSync(envPath, basicEnv);
      logSuccess('Created basic .env.local file');
    }
  } else {
    logWarning('.env.local already exists, skipping...');
  }
}

function installDependencies() {
  logStep('4/7', 'Installing dependencies...');

  try {
    // Check if package-lock.json exists to determine package manager
    const hasPackageLock = fs.existsSync(path.join(process.cwd(), 'package-lock.json'));
    const hasYarnLock = fs.existsSync(path.join(process.cwd(), 'yarn.lock'));

    let installCommand;
    if (hasYarnLock) {
      installCommand = 'yarn install';
    } else if (hasPackageLock) {
      installCommand = 'npm install';
    } else {
      installCommand = 'npm install';
    }

    log(`Running: ${installCommand}`, 'blue');
    execSync(installCommand, { stdio: 'inherit' });
    logSuccess('Dependencies installed successfully');
  } catch (error) {
    logError('Failed to install dependencies');
    logError(error.message);
    process.exit(1);
  }
}

function createGitignore() {
  logStep('5/7', 'Setting up .gitignore...');

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreContent = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Database
data/
*.db
*.sqlite

# Uploads
uploads/
!uploads/.gitkeep

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
    logSuccess('Created .gitignore file');
  } else {
    logWarning('.gitignore already exists, skipping...');
  }
}

function createKeepFiles() {
  logStep('6/7', 'Creating .gitkeep files...');

  const keepFiles = [
    'data/.gitkeep',
    'uploads/.gitkeep',
    'uploads/thumbnails/.gitkeep'
  ];

  keepFiles.forEach(keepFile => {
    const keepPath = path.join(process.cwd(), keepFile);
    if (!fs.existsSync(keepPath)) {
      fs.writeFileSync(keepPath, '# This file ensures the directory is tracked by Git\n');
      logSuccess(`Created ${keepFile}`);
    }
  });
}

function setupComplete() {
  logStep('7/7', 'Setup complete!');

  log('\n🎉 SnapVault development environment is ready!', 'green');
  log('\nNext steps:', 'bright');
  log('1. Review your .env.local file and adjust settings if needed');
  log('2. Run "npm run dev" to start the development server');
  log('3. Open http://localhost:3000 in your browser');
  log('4. Create your first account and start uploading files!');

  log('\nUseful commands:', 'bright');
  log('• npm run dev     - Start development server');
  log('• npm run build   - Build for production');
  log('• npm run start   - Start production server');
  log('• npm run lint    - Run ESLint');

  log('\nFor help and documentation:', 'bright');
  log('• Check README.md for detailed instructions');
  log('• Visit the project repository for issues and updates');

  log('\nHappy coding! 🚀', 'cyan');
}

// Run setup steps
async function runSetup() {
  try {
    checkNodeVersion();
    createDirectories();
    setupEnvironment();
    installDependencies();
    createGitignore();
    createKeepFiles();
    setupComplete();
  } catch (error) {
    logError('Setup failed:');
    logError(error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  runSetup();
}

module.exports = {
  runSetup,
  checkNodeVersion,
  createDirectories,
  setupEnvironment,
  installDependencies,
  createGitignore,
  createKeepFiles,
};
