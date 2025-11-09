# KLOB Retail Analytics Platform

## Overview

KLOB is a SaaS retail analytics and prediction platform for brands and SMEs. It enables clients to upload historical sales data (Excel/CSV) to generate instant insights through automated dashboards, demand forecasting, price optimization, and inventory management recommendations. The platform supports multi-tenant operations with customized data preprocessing pipelines that adapt to specific Excel/CSV structures. Its core value proposition is to provide purchasing plans, pricing recommendations, and comprehensive sales/inventory dashboards personalized to the client's data.

Key capabilities include multi-file upload with automatic structure detection, client-specific preprocessing with Spanish header support, retail KPI dashboards (sales, returns, stock rotation, top products, sales by region/store), advanced filtering, and special handling for different store types.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript and Vite.
**UI/UX**: Radix UI primitives with shadcn/ui components, inspired by Carbon/Ant Design for data-heavy B2B SaaS. Features a custom dark/light mode, Inter font for UI, and JetBrains Mono for numerical data. Tailwind CSS is used for layout.
**State Management**: React Context API for global state, TanStack Query for server state and caching.
**Routing**: Wouter, handling routes for `/`, `/analytics`, `/forecasting`, and `/sentiment`.
**Key Components**: `AppSidebar`, `FileUpload`, `FilterSidebar`, `DashboardTabs`, `KPICard`, and a section-aware `Chatbot`. Includes various charting components for sales, transfers, units by size, and warehouse entries, with expandable chart functionality.

### Backend Architecture

**Framework**: Express.js with TypeScript.
**API Design**: RESTful HTTP endpoints for file upload, dashboard data, filter options, various charts, forecast job management, and chatbot queries.
**File Processing Pipeline**: Utilizes Multer for uploads, XLSX for column detection, automatic mapping of Spanish headers, and transformation into normalized schemas (Ventas, Productos, Traspasos). Client-specific configurations are stored for repeat uploads.
**Data Processing Services**: `excelProcessor.ts`, `kpiCalculator.ts`, advanced forecasting system (`seasonalForecasting.ts`, `advancedForecasting.ts`, `ensembleForecasting.ts`), and `chatbotService.ts` provide modular business logic.
**Advanced Forecasting Engine**: Production-ready ML ensemble combining 4 algorithms (Weighted Moving Average, Linear Regression with R², Holt-Winters Double Exponential Smoothing, Prophet-like Decomposition). Features automatic data cleaning with IQR outlier detection, feature engineering (price elasticity, trend scores, size distributions), temporal cross-validation for accuracy measurement, and intelligent ensemble weighting by historical MAPE (with epsilon = 0.01 to handle perfect models). Delivers predictions with comprehensive metrics (MAPE, MAE, RMSE) for transparent model performance evaluation. **Improved Coverage System (Nov 9, 2025)**: Achieved ~58-60% product coverage (up from 17.8%) through: (1) Relaxed sales filter from 5 to 2 units, (2) Hierarchical fallback using family/theme averages for low-volume products (1-2 units), (3) Enhanced validation supporting 2+ years of data with 5-fold cross-validation and hold-out method for 2-year series, (4) Adaptive model requirements (advanced models require 3+ years, basic models 2+). **Confidence System**: Three-tier classification (Alta ≥70%, Media ≥50%, Baja ≥30%) based on historical MAPE and data years, with conservative MAPE estimation (70% for simple averages, dynamic calculation for family fallbacks). Ensemble uses adaptive weighting (1/(MAPE+ε)) where models with lower error receive proportionally higher weight, and selection thresholds ensure quality forecasts.
**Storage Strategy**: Interface-based design (`IStorage`) supporting both in-memory development storage and persistent database storage.

### Data Storage Solutions

**Database**: PostgreSQL 17.6 on Easypanel (external infrastructure), using standard `pg` driver with `drizzle-orm/node-postgres`.
**Storage Strategy**: DatabaseStorage implementation (migrated from in-memory MemStorage Nov 8, 2025) providing permanent data persistence across server restarts.
**Data Models**: Six production tables - `uploaded_files`, `client_configs`, `ventas_data`, `productos_data`, `traspasos_data`, `forecast_jobs` with indexes on file_id for performance.
**Schema Design**: Drizzle ORM tables with flexible optional fields, JSON columns for complex data (sheets, columnMappings, forecast results), Spanish field names preserved, batch inserts (1000/batch) for large datasets, automatic null→undefined conversion via normalizeRow helper.
**Excel Column Mappings**: Configured for TRUCCO data, mapping specific Spanish headers to internal schema fields across 'ventas', 'Compra', and 'Traspasos de almacén a tienda' sheets. Includes filtering rules and special handling for different store types.

### Authentication and Authorization

**Current State**: Demo mode with client ID passed in the upload request.
**Architecture Preparation**: Multi-tenant data model with `clientId` foreign keys and session infrastructure ready for future implementation.

## External Dependencies

**Core Runtime Dependencies**:
- **React Ecosystem**: `react`, `react-dom`, `wouter`
- **State Management**: `@tanstack/react-query`
- **UI Components**: `@radix-ui/*`, `shadcn/ui`
- **Forms & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **Database**: `drizzle-orm`, `drizzle-zod`, `@neondatabase/serverless`
- **File Processing**: `xlsx`, `multer`
- **Utilities**: `date-fns`, `clsx`, `class-variance-authority`, `tailwind-merge`

**Development Tools**: TypeScript, Vite, ESBuild, Tailwind CSS, PostCSS, Drizzle Kit.

**Third-Party Services**:
- **Database Hosting**: Neon Database (PostgreSQL)
- **AI**: OpenAI API (for chatbot with `gpt-4o-mini`)

**Planned ML/Analytics Stack**: Python backend services for ML predictions (e.g., CatBoost) to integrate with the existing Express API.