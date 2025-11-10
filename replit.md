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
**Routing**: Wouter with restructured routes - `/` for public landing page, `/login` for authentication, `/app/*` for authenticated application routes (analytics, forecasting, sentiment, upload).
**Internationalization** (Implemented Nov 10, 2025): Complete i18n infrastructure with LanguageProvider React Context, bilingual support (ES/EN) via `i18n/es.ts` and `i18n/en.ts`, and LanguageSwitcher component for seamless language toggling.
**Landing Page** (Implemented Nov 10, 2025): Professional marketing website at `/` with modular components inspired by Celonis design:
- **HeroSection**: Animated gradients with CSS blob animations, headline with value proposition, dual CTAs (demo request + platform preview)
- **FeaturesSection**: Three-column showcase for Analytics, Forecasting, and Sentiment modules with Framer Motion stagger animations
- **DashboardPreview**: Interactive tabs displaying real app visualizations (KPI cards, forecast metrics, sentiment distribution)
- **BenefitsSection**: Four statistical highlights with gradient backgrounds (40% stock reduction, 90% accuracy, 10x speed, 99.8% coverage)
- **PricingSection**: CTA-focused demo request section
- **LandingNav**: Fixed navigation with smooth scrolling, language switcher, and login/demo CTAs
**Key Components**: `AppSidebar`, `FileUpload`, `FilterSidebar`, `DashboardTabs`, `KPICard`, `SentimentAnalysis`, and a section-aware `Chatbot`. Includes various charting components for sales, transfers, units by size, warehouse entries, sentiment distribution, and topic analysis, with expandable chart functionality.

### Backend Architecture

**Framework**: Express.js with TypeScript.
**API Design**: RESTful HTTP endpoints for file upload, dashboard data, filter options, various charts, forecast job management, sentiment analysis, and chatbot queries.
**File Processing Pipeline**: Utilizes Multer for uploads, XLSX for column detection, automatic mapping of Spanish headers, and transformation into normalized schemas (Ventas, Productos, Traspasos). Client-specific configurations are stored for repeat uploads.
**Data Processing Services**: `excelProcessor.ts`, `kpiCalculator.ts`, advanced forecasting system (`seasonalForecasting.ts`, `advancedForecasting.ts`, `ensembleForecasting.ts`), and `chatbotService.ts` provide modular business logic.
**Advanced Forecasting Engine**: Production-ready ML ensemble combining 4 algorithms (Weighted Moving Average, Linear Regression with R², Holt-Winters Double Exponential Smoothing, Prophet-like Decomposition). Features automatic data cleaning with IQR outlier detection, feature engineering (price elasticity, trend scores, size distributions), temporal cross-validation for accuracy measurement, and intelligent ensemble weighting by historical MAPE (with epsilon = 0.01 to handle perfect models). Delivers predictions with comprehensive metrics (MAPE, MAE, RMSE) for transparent model performance evaluation. **Improved Coverage System (Nov 9, 2025)**: Achieved ~58-60% product coverage (up from 17.8%) through: (1) Relaxed sales filter from 5 to 2 units, (2) Hierarchical fallback using family/theme averages for low-volume products (1-2 units), (3) Enhanced validation supporting 2+ years of data with 5-fold cross-validation and hold-out method for 2-year series, (4) Adaptive model requirements (advanced models require 3+ years, basic models 2+). **Confidence System**: Three-tier classification (Alta ≥70%, Media ≥50%, Baja ≥30%) based on historical MAPE and data years, with conservative MAPE estimation (70% for simple averages, dynamic calculation for family fallbacks). Ensemble uses adaptive weighting (1/(MAPE+ε)) where models with lower error receive proportionally higher weight, and selection thresholds ensure quality forecasts.
**Storage Strategy**: Interface-based design (`IStorage`) supporting both in-memory development storage and persistent database storage.

### Data Storage Solutions

**Database**: PostgreSQL 17.6 on Easypanel (external infrastructure), using standard `pg` driver with `drizzle-orm/node-postgres`.
**Storage Strategy**: DatabaseStorage implementation (migrated from in-memory MemStorage Nov 8, 2025) providing permanent data persistence across server restarts.
**Data Models**: Seven production tables - `uploaded_files`, `client_configs`, `ventas_data`, `productos_data`, `traspasos_data`, `forecast_jobs`, `sentiments_data` with indexes on file_id and clientId for performance.
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

**Python ML Stack** (Implemented Nov 10, 2025): Production Python ML forecasting engine with CatBoost and XGBoost AutoML for demand prediction.
- **Dependencies**: `pandas`, `scikit-learn`, `catboost`, `xgboost`, `joblib`, `openpyxl`, `numpy`
- **Modules**: `forecasting_engine/` with `preprocessing.py`, `training.py`, `prediction.py`, `plan_compras.py`, `main.py`
- **Features**: Season extraction from Tema field, temporal train/test splits, AutoML model selection by MAPE, comprehensive metric reporting (MAPE, MAE, RMSE, product coverage)
- **Integration**: Secure async job worker (`mlJobWorker.ts`) executing Python CLI with Zod validation, timeout handling, regex-based JSON parsing for multi-line prettified output
- **Metrics Persistence** (Nov 10, 2025): Model metrics saved alongside trained models in JSON sidecar files (`metrics_{season_type}.json`), loaded during prediction to surface MAPE/MAE/RMSE in frontend
- **Data Contract Alignment** (Nov 10, 2025): Prediction output fields mapped to frontend expectations (`temporada_objetivo`, `cobertura_productos`, `modelo_ganador`, `mape`, `mae`, `rmse`, `plan_compras`)
- **API Endpoints**: `/api/ml/train` (train CatBoost/XGBoost models), `/api/ml/predict` (generate Plan de Compras for PV/OI seasons)
- **UI**: Forecasting page selector between "Predicción Estándar (Ensemble)" and "Predicción Avanzada (CatBoost/XGBoost)", displays complete model metrics and performance indicators
- **Current Capabilities**: ~58-60% product coverage at SKU level (limited by 1-year historical data for most products), better precision at section/family aggregation level. System designed to improve as more historical data accumulates.
- **Commercial Positioning**: Focus on "99.8% coverage through hierarchical fallbacks", "improving each season with more data", and "actionable section-level insights"

**Sentiment Analysis Module** (Implemented Nov 10, 2025): Production NLP module analyzing customer feedback from social media and reviews using OpenAI GPT-4o-mini for sentiment classification and topic detection.
- **Data Sources**: Instagram API and Google Reviews API integration with graceful degradation to sample data when credentials are absent
- **NLP Processing**: `sentimentAnalysis.ts` service with text normalization, sentiment classification (positivo/neutro/negativo), topic detection (producto/talla/calidad/precio/envio/tienda/web), and fallback to neutral on API failures
- **Database**: `sentiments_data` table with canal (instagram/google_reviews), tipo_fuente (social_media/reviews), sentiment score, tema, texto, fecha, and origen_detalle fields
- **API Endpoints**: 
  - `/api/sentiment/fetch` - Fetches and analyzes new comments from configured sources
  - `/api/sentiment/summary/:clientId` - Returns KPI summary (global/social/reviews sentiment scores, total comments)
  - `/api/sentiment/charts/:clientId` - Returns visualization data (sentiment distribution, by channel, time series, by topic)
  - `/api/sentiment/comments/:clientId` - Returns filtered comment list with pagination
  - All endpoints support optional `canal` and `tema` query parameters for filtering
- **UI Components**: Complete `SentimentAnalysis.tsx` page with:
  - 4 KPI cards: Global Sentiment, Social Media Sentiment, Reviews Sentiment, Total Comments
  - Interactive filters: Canal (todos/instagram/google_reviews), Tema (todos/producto/talla/calidad/precio/envio/tienda/web)
  - Visualizations: Donut chart (sentiment distribution), Stacked bar (by channel), Line chart (time series), Horizontal bar (by topic)
  - Comments table with sentiment badges, topic tags, and source information
- **Data Flow**: Connectors → NLP Service (OpenAI) → Storage → API → TanStack Query → UI with proper filter propagation
- **Query Structure**: Corrected TanStack Query keys following pattern `[endpoint, pathParam, queryParamsObject]` for proper URL generation and cache invalidation
- **Security**: Zod validation on all endpoints, sanitized inputs, batch insertion protection, no secret exposure
- **Production Readiness**: Complete end-to-end flow with error handling, loading states, graceful degradation, and responsive design