# Environment-Based Data Separation

## Overview

The badminton booking system now uses environment-based data separation to keep development and production data completely isolated. This prevents development testing from affecting production data and ensures production data is preserved across deployments.

## How It Works

### Environment Detection

The system automatically detects the environment using these indicators:

- **Development**: `NODE_ENV=development` and no `REPLIT_DEPLOYMENT` environment variable
- **Production**: `REPLIT_DEPLOYMENT` exists OR `NODE_ENV=production`

### Database Key Prefixing

All database operations use environment-specific prefixes:

- **Development**: `dev_members`, `dev_bookings`, `dev_activities`, `dev_comments`
- **Production**: `prod_members`, `prod_bookings`, `prod_activities`, `prod_comments`

## Benefits

### 1. Data Safety
- **Development testing** cannot accidentally modify production data
- **Production data** remains intact during development work
- **Safe experimentation** with new features without risk

### 2. Deployment Protection
- **Production data persists** across new deployments
- **No data loss** when pushing updates to production
- **Clean separation** between environments

### 3. Testing Freedom
- **Full development environment** with its own data set
- **Reset development data** anytime without affecting production
- **Test destructive operations** safely

## Current Status

✅ **Active**: Environment separation is now enabled
✅ **Development**: Uses `dev_` prefixed keys  
✅ **Production**: Uses `prod_` prefixed keys
✅ **Automatic Detection**: No manual configuration needed

## Database Console Output

When starting the application, you'll see:
```
🗄️  Database Environment: dev (NODE_ENV: development, REPLIT_DEPLOYMENT: undefined)
```

This confirms which environment is active and the reasoning behind the detection.

## Migration Notes

- **Existing production data**: Preserved under `prod_` keys
- **Development starts fresh**: New `dev_` namespace with default members
- **No data loss**: All previous production data remains accessible

## For Developers

When working in development:
1. You get a fresh set of test members automatically
2. All your test bookings/comments use the `dev_` namespace
3. Production data remains completely untouched
4. Deploy with confidence knowing production data is safe

## For Production Deployments

When deploying to production:
1. Environment automatically detected as production
2. Uses existing `prod_` data keys
3. All production data preserved
4. No migration or setup needed