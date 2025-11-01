# KLOB Retail Analytics Platform

## Overview

KLOB is a SaaS-style retail analytics and prediction platform designed for retail brands and SMEs. The platform enables clients to upload historical sales data (Excel/CSV files) and receive instant insights through automated dashboards, demand forecasting, price optimization, and inventory management recommendations. The system supports multi-tenant operations where each client can have customized data preprocessing pipelines that automatically detect and adapt to their specific Excel/CSV structures.

**Core Value Proposition**: Upload retail data → Get purchasing plans + pricing recommendations + comprehensive sales/inventory dashboards personalized to your data structure.

**Key Features**:
- Multi-file Excel/CSV upload with automatic structure detection (tested with 114k+ sales records)
- Client-specific preprocessing pipelines with Spanish column header support
- Retail KPI dashboards (sales analysis, returns tracking, stock rotation, top products, sales by region/store)
- Advanced filtering by Season (Temporada), Product Family (Familia), and Stores (Tiendas)
- Special handling for online stores, Naelle stores, and COIN/Italia stores
- Real-time KPI calculations excluding GR.ART.FICTICIO pseudo-products

**Recent Updates (Nov 2025)**:
- ✅ Successfully migrated from Streamlit to React with KLOB maroon branding (HSL 0 65% 35%)
- ✅ Excel processor updated for TRUCCO data structure (ventas 23 24 25, Compra, Traspasos de almacén a tienda)
- ✅ Column mappings aligned with actual Spanish headers (Artículo, NombreTPV, Fecha Documento, Descripción Color)
- ✅ Filter UX improved: selections are local until "Aplicar Filtros" button is clicked
- ✅ Processing 114,684 ventas, 5,165 productos, 14,039 traspasos from real client data
- ✅ Login page implemented with "Retail Analytics" branding and KLOB logo
- ✅ Protected routes system using localStorage authentication
- ✅ KPI numbers size reduced (text-2xl) for better visual balance
- 🚧 In progress: Completing all 4 dashboard sections with Streamlit feature parity

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, Vite build system

**UI Component Library**: Radix UI primitives with shadcn/ui component system
- Design philosophy: Carbon Design/Ant Design inspired for data-heavy B2B SaaS
- Theme system: Custom dark/light mode with CSS variables for colors
- Typography: Inter for UI/body, JetBrains Mono for numerical data
- Layout: Tailwind CSS with custom spacing scale optimized for data density

**State Management**:
- React Context API (`DataContext`) for global state (file uploads, active filters)
- TanStack Query (React Query) for server state management and caching
- Local component state for UI interactions

**Routing**: Wouter (lightweight client-side routing)
- `/` - Upload page
- `/dashboard` - Main analytics dashboard with tabbed interface

**Key Frontend Components**:
- `FileUpload`: Drag-and-drop Excel/CSV upload with progress tracking
- `FilterSidebar`: Dynamic filtering by temporada (season), familia (product family), tiendas (stores)
- `DashboardTabs`: Tabbed interface (Overview, Geographic/Stores, Products/Campaigns)
- `KPICard`: Reusable metric display with trend indicators
- Chart components: Demand forecasting, price optimization, regional sales, inventory tables, top products

### Backend Architecture

**Framework**: Express.js with TypeScript (ES modules)

**API Design**: RESTful HTTP endpoints
- `POST /api/upload` - File upload and initial processing
- `GET /api/dashboard/:fileId` - Dashboard data with optional filter query params
- `GET /api/filters/:fileId` - Available filter options for uploaded data

**File Processing Pipeline**:
1. Multer middleware handles file uploads (50MB limit, Excel/CSV only)
2. Column structure detection using XLSX library
3. Automatic mapping of Spanish column headers to schema
4. Data transformation into normalized schemas (Ventas, Productos, Traspasos)
5. Client-specific configuration storage for repeat uploads

**Data Processing Services**:
- `excelProcessor.ts`: Column detection, structure mapping, sheet parsing
- `kpiCalculator.ts`: Business logic for KPI calculations, filtering, aggregations
- Separation of data processing logic from API routes for maintainability

**Storage Strategy**:
- In-memory storage implementation (`MemStorage`) for development
- Interface-based design (`IStorage`) allows easy swap to persistent database
- Separate storage for: uploaded files metadata, client configs, sales data, product data, transfer data

### Data Storage Solutions

**Current Implementation**: In-memory Map-based storage (development/demo mode)

**Database Ready**: 
- Drizzle ORM configured with PostgreSQL dialect
- Schema definitions in `shared/schema.ts` using Zod
- Migration support via `drizzle-kit`
- Connection setup for Neon serverless PostgreSQL

**Data Models**:
- **UploadedFile**: Metadata for client uploads (fileId, clientId, fileName, sheets, uploadDate)
- **ClientConfig**: Per-client preprocessing configuration (column mappings, last updated)
- **VentasData**: Sales transactions (product codes, quantities, prices, dates, stores, categories)
- **ProductosData**: Purchase/inventory data (products, quantities ordered, costs, PVP)
- **TraspasosData**: Store transfer data (products moved between locations)

**Schema Design Philosophy**:
- Flexible optional fields to handle varying client data structures
- Spanish field names preserved (act, codigoUnico, familia, temporada) reflecting domain
- URL fields for product images (urlImage, urlThumbnail)
- Boolean flags for store type classification (esOnline)

**Excel Column Mappings (TRUCCO Data)**:
- **Ventas Sheet** ("ventas 23 24 25"): Artículo→codigoUnico, NombreTPV→tienda, TPV→codigoTienda, Fecha Documento→fechaVenta, Descripción Color→color
- **Productos Sheet** ("Compra"): Same mappings as ventas for consistency
- **Traspasos Sheet** ("Traspasos de almacén a tienda"): Artículo→codigoUnico, NombreTpvDestino→tienda, Fecha Documento→fechaEnviado
- **Filtering**: Excludes rows with cantidad=0, empty tienda, or tiendas in TIENDAS_A_ELIMINAR list
- **Special Tiendas**: 6 online stores (TRUCCO ONLINE B2C, NAELLE ONLINE B2C, etc.), Naelle stores (contain "NAELLE"), Italia/COIN stores (contain "COIN")

### Authentication and Authorization

**Current State**: Demo mode with placeholder client identification
- Client ID passed in upload request body
- No authentication implemented yet

**Architecture Preparation**:
- Multi-tenant data model with clientId foreign keys
- Session infrastructure ready (connect-pg-simple for future session storage)
- API endpoints structured to receive authenticated user context

### External Dependencies

**Core Runtime Dependencies**:
- **React Ecosystem**: react, react-dom, wouter (routing)
- **State Management**: @tanstack/react-query
- **UI Components**: @radix-ui/* primitives (20+ components), shadcn/ui patterns
- **Forms**: react-hook-form, @hookform/resolvers, zod (validation)
- **Database**: drizzle-orm, drizzle-zod, @neondatabase/serverless
- **File Processing**: xlsx (Excel parsing), multer (file uploads)
- **Utilities**: date-fns, clsx, class-variance-authority, tailwind-merge

**Development Tools**:
- TypeScript compiler with strict mode
- Vite for build and HMR
- ESBuild for server bundling
- Tailwind CSS + PostCSS
- Drizzle Kit for migrations

**Planned ML/Analytics Stack** (from migration notes):
- Python backend services for ML predictions
- CatBoost for demand forecasting models
- Integration with current Express API (microservices pattern)

**Third-Party Services**:
- Neon Database (PostgreSQL hosting)
- Google Fonts (Inter, Geist Mono, DM Sans, Fira Code, Architects Daughter)

**Asset Management**:
- Static assets in `/attached_assets` (legacy Streamlit code, requirements, README)
- Client assets resolved via Vite alias `@assets`