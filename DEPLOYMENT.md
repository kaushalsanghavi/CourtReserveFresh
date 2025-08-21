# Production Deployment Guide

## Environment-Based Feature Toggling

This application uses environment variables to hide development-only features in production:

### Development vs Production Features

**Development Only:**
- `/comments-demo` route - Design comparison page
- "Design Options" link in header navigation

**Production:**
- These features are automatically hidden when deployed

### How It Works

The app checks for production environment using:
```javascript
const isProduction = import.meta.env.PROD || import.meta.env.VITE_REPLIT_DEPLOYMENT;
```

- `import.meta.env.PROD` - Vite's built-in production flag
- `import.meta.env.VITE_REPLIT_DEPLOYMENT` - Replit's deployment environment variable

### Deployment Process

When you deploy on Replit:
1. The `REPLIT_DEPLOYMENT` environment variable is automatically set to `1`
2. The demo route and navigation link are automatically hidden
3. Users cannot access `/comments-demo` in production
4. The header only shows the main calendar navigation

### Testing Production Mode

To test production behavior locally:
1. Build for production: `npm run build`
2. Or set environment variable: `VITE_REPLIT_DEPLOYMENT=1 npm run dev`

This ensures a clean, professional interface for end users while keeping development tools available during development.