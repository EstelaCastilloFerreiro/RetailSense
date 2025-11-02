# RetailSense - Retail Intelligence Platform

A comprehensive retail analytics platform for demand forecasting, pricing optimization, and inventory management.

## Features

- 📊 **Excel File Processing**: Upload and process Excel/CSV files with multiple sheets (Ventas, Compra, Traspasos)
- 📈 **Dashboard Analytics**: Real-time KPIs, sales metrics, and visualizations
- 🗺️ **Geographic Analysis**: Sales performance by store location
- 💰 **Product Profitability**: Analyze product performance and profitability
- 📸 **Photo Analysis**: Visual product analysis capabilities
- 🔍 **Advanced Filtering**: Filter by season, product family, stores, and date ranges
- 🎨 **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js, TypeScript
- **Data Processing**: xlsx (Excel parsing), Zod (validation)
- **Storage**: In-memory storage (can be extended to PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The server will start on port 5000 (or automatically switch to an available port like 5173).

### Usage

1. Open http://localhost:5000 (or the port shown in console)
2. Upload an Excel file with sheets named:
   - **Ventas** (Sales)
   - **Compra** (Products/Purchase)
   - **Traspasos** (Transfers)
3. View analytics in the dashboard

## Project Structure

```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/      # Page components
│   │   └── contexts/   # React contexts
├── server/          # Express backend
│   ├── routes.ts    # API routes
│   └── services/    # Business logic
├── shared/          # Shared schemas/types
└── package.json     # Dependencies
```

## API Endpoints

- `POST /api/upload` - Upload Excel file
- `GET /api/dashboard/:fileId` - Get dashboard data
- `GET /api/dashboard-extended/:fileId` - Get extended dashboard data
- `GET /api/filters/:fileId` - Get available filters
- `GET /api/geographic/:fileId` - Get geographic metrics
- `GET /api/dashboard-products/:fileId` - Get product profitability data
- `GET /api/dashboard-photos/:fileId` - Get photo analysis data

## Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Type checking
npm run check
```

## License

MIT

## Author

Estela Castillo Ferreiro

