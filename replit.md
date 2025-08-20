# Badminton Court Booking System

## Overview

A full-stack badminton court booking application built with modern web technologies. The system allows users to book and manage badminton court slots, view booking calendars, track activity history, and monitor monthly participation statistics. The application features proper member selection, booking/cancellation functionality, detailed device tracking with browser and OS information, and uses a clean, professional design inspired by the Ramp design system with custom color palettes and shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Aug 20, 2025)

- Fixed booking system bug where all bookings were assigned to first member (Ashish)
- Implemented SelectedMemberProvider context for proper member selection across components  
- Added booking/cancellation functionality with member-specific actions
- Enhanced device tracking to capture exact device model, OS version, and browser information
- Updated UI to show selected member and highlight their bookings in green
- Added red cancel buttons for existing member bookings

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
- **Primary Storage**: File-based JSON storage system using local files
- **Database Schema**: Drizzle ORM schema definitions with PostgreSQL dialect (prepared for future migration)
- **Data Files**: Separate JSON files for members, bookings, and activities in `/data` directory
- **Storage Interface**: Abstracted storage layer with IStorage interface for easy database swapping

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