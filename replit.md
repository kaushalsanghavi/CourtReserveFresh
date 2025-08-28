# Badminton Court Booking System

## Overview

A full-stack badminton court booking application built with modern web technologies. The system allows users to book and manage badminton court slots, view booking calendars, track activity history, and monitor monthly participation statistics. The application features proper member selection, booking/cancellation functionality, detailed device tracking with browser and OS information, and uses a clean, professional design inspired by the Ramp design system with custom color palettes and shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Aug 28, 2025)

- ✅ **CRITICAL PRODUCTION BUG FIXED** - Resolved booking creation failure in production
  - **Issue**: Booking route wasn't generating UUIDs, causing "undefined" IDs and database constraint violations
  - **Fix**: Added `crypto.randomUUID()` ID generation to booking creation route
  - **Database Cleanup**: Removed corrupted booking record with undefined ID from production
  - **Verification**: New bookings now create successfully with proper UUIDs
- ✅ **Comment Focus Issue Resolved** - Fixed textarea losing focus while typing
  - **Solution**: Added `spellCheck={false}` and `autoComplete="off"` to prevent browser interference
  - **UI Preserved**: Maintained exact approved Comments interface design
- ✅ **Production Deployment Ready** - All fixes tested and validated in development

## Previous Changes (Aug 27, 2025)

- ✅ **TRUE DATABASE SEPARATION ACHIEVED** - Implemented schema-based separation within single PostgreSQL instance
  - **Production Schema**: Contains all real data (10 members, 26 bookings through Aug 27, 32 activities)
  - **Development Schema**: Contains clean sample data (5 dev members, 3 sample bookings)
  - **Environment Detection**: Automatically switches schemas based on NODE_ENV and REPLIT_DEPLOYMENT
  - **Data Safety**: Production data fully preserved and isolated from development work
- ✅ **Critical Data Placement Corrected** - Fixed initial misplacement where production data was in wrong schema
  - **Issue Identified**: Production data was accidentally moved to development schema
  - **Resolution**: Moved real production data back to production schema via automated script
  - **Verification**: Confirmed latest bookings through August 27th in correct production location
- ✅ **Dynamic Schema Detection** - Improved environment-aware database connection
  - **Development Mode**: Uses development.* tables with sample data for safe testing
  - **Production Mode**: Uses production.* tables with authentic booking history
  - **Runtime Switching**: Schema selection happens at query time, not initialization
- ✅ **Comment Focus Issue Fixed** - Simplified component structure to prevent input focus loss during typing
- ✅ **Previous Features Maintained**:
  - **Comments Feature** with CRUD operations and multiple display variants
  - **Time-Based Booking Restrictions** (past days + today after 9:30 AM disabled)
  - **Sortable Monthly Participation** tracking with visual indicators
  - **Device Tracking** with browser and OS information
- 📊 **Storage Evolution**: in-memory → file-based → ReplDB → **PostgreSQL (schema-separated)** (current)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development tooling
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom Ramp-inspired design tokens
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Date Handling**: date-fns library for date manipulation and formatting

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Development**: TSX for running TypeScript files directly in development
- **Build System**: ESBuild for production bundling with Node.js compatibility
- **API Structure**: RESTful endpoints under `/api` prefix for members, bookings, and activities
- **Error Handling**: Centralized error middleware with structured error responses

### Data Storage
- **Primary Storage**: PostgreSQL database with Drizzle ORM and schema-based separation
- **Database Architecture**: Single PostgreSQL instance with two schemas:
  - **production.*** tables: Real production data (10 members, 26 bookings, 32 activities)
  - **development.*** tables: Sample data for safe development testing (5 dev members, 3 sample bookings)
- **Environment-Aware Data Management**: 
  - **Development**: Automatically uses development schema with clean sample data
  - **Production**: Automatically uses production schema with authentic booking history
  - **Schema Switching**: Dynamic based on NODE_ENV and REPLIT_DEPLOYMENT environment variables
- **Data Safety**: Complete isolation between environments while sharing single database instance
- **Migration Path**: All production data successfully recovered and placed in correct schema
- **Backup Strategy**: ReplDB contains historical backup of original production data

### Design System
- **Theme**: Ramp-inspired color palette with custom CSS variables
- **Components**: shadcn/ui "new-york" variant with neutral base colors
- **Typography**: Inter font family for clean, modern appearance
- **Dark Mode**: CSS class-based dark mode support (configured but not actively used)
- **Responsive**: Mobile-first responsive design with Tailwind breakpoints

### Development Workflow
- **Hot Reload**: Vite HMR for instant development feedback
- **Type Safety**: Comprehensive TypeScript configuration across client and server
- **Code Organization**: Monorepo structure with shared types and utilities
- **Build Process**: Separate client and server build pipelines with optimized output

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL database driver (for future database migration)
- **drizzle-orm**: Type-safe ORM with schema validation
- **drizzle-zod**: Integration between Drizzle and Zod for runtime validation

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui**: Comprehensive set of accessible UI primitives
- **wouter**: Lightweight React router
- **date-fns**: Date manipulation and formatting utilities
- **class-variance-authority**: Utility for creating component variants
- **clsx** and **tailwind-merge**: Utility libraries for conditional CSS classes

### Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit-specific development features

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **postcss**: CSS post-processing
- **autoprefixer**: CSS vendor prefix automation

The application is designed to be easily deployable on Replit with built-in development tools and can be migrated from file-based storage to PostgreSQL without changing the application logic due to the abstracted storage layer.