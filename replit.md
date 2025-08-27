# Badminton Court Booking System

## Overview

A full-stack badminton court booking application built with modern web technologies. The system allows users to book and manage badminton court slots, view booking calendars, track activity history, and monitor monthly participation statistics. The application features proper member selection, booking/cancellation functionality, detailed device tracking with browser and OS information, and uses a clean, professional design inspired by the Ramp design system with custom color palettes and shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Aug 27, 2025)

- ✅ **Production Data Recovery** - Successfully restored current production data from ReplDB to PostgreSQL
  - **Critical Issue Resolved**: Recovered 26 bookings, 32 activities, and 2 comments from August 22-27
  - **Data Verification**: Confirmed latest bookings through August 27th are properly migrated
  - **ReplDB Backup**: Original production data remains safely in ReplDB as backup
- ✅ **Environment Detection Fixed** - Improved NODE_ENV detection for proper dev/prod separation
  - **Development**: Uses sample data for testing without affecting production
  - **Production**: Preserves real booking data and activity history
  - **Auto-Detection**: Automatically detects environment based on REPLIT_DEPLOYMENT flag
- ✅ **Comment Focus Issue Fixed** - Simplified component structure to prevent input focus loss during typing
- ⚠️ **Known Architecture Issue**: Single PostgreSQL database shared between dev/prod environments
  - **Current State**: Same DATABASE_URL used for both development and production
  - **Recommended**: Separate production PostgreSQL database (Replit best practice)
  - **Workaround**: Environment-aware data initialization prevents development data in production
- ✅ **Previous Features Maintained**:
  - **Comments Feature** with CRUD operations and multiple display variants
  - **Time-Based Booking Restrictions** (past days + today after 9:30 AM disabled)
  - **Sortable Monthly Participation** tracking with visual indicators
  - **Device Tracking** with browser and OS information
- 📊 **Storage Evolution**: in-memory → file-based → ReplDB → **PostgreSQL (shared)** (current)

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
- **Primary Storage**: PostgreSQL database with Drizzle ORM (shared between environments)
- **Database Schema**: Complete Drizzle schema with proper relations and constraints
- **Environment-Aware Data Management**: 
  - **Development**: Uses sample data for testing (26 bookings, activities, comments)
  - **Production**: Real production data (26 current bookings through Aug 27, 32 activities)
- **Data Recovery**: Successfully migrated all production data from ReplDB to PostgreSQL
- **Backup Strategy**: ReplDB remains as backup containing original production data
- **Architecture Note**: Currently uses single PostgreSQL instance (not ideal, should be separate prod/dev databases)

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