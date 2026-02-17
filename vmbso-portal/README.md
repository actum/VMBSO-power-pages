# VMBSO Customer Portal

A React-based Single Page Application (SPA) for the VMBSO customer document portal, built with TypeScript and Material-UI.

## Project Structure

```
vmbso-portal/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Documents.tsx
│   │   ├── Profile.tsx
│   │   └── NotFound.tsx
│   ├── theme/
│   │   └── theme.ts
│   ├── types/
│   │   ├── contact.ts
│   │   └── document.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── package.json
└── tsconfig.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Power Platform CLI (PAC) installed
- Access to Power Pages environment

### Installation

1. Navigate to the project directory:
```bash
cd vmbso-portal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Available Scripts

- `npm start` - Run the app in development mode
- `npm run build` - Build the app for production
- `npm test` - Run tests
- `npm run deploy` - Build and deploy to Power Pages using PAC CLI

## Development Workflow

### Local Development
The project is configured with a proxy to the Power Pages environment:
- Proxy: `https://site-alfw4.powerappsportals.com`
- API calls to `/_api/*` will be proxied during development

### Building for Production
```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Deployment to Power Pages
```bash
npm run deploy
```

This will:
1. Build the production bundle
2. Upload to Power Pages using PAC CLI

Make sure you're authenticated with PAC CLI before deploying:
```bash
pac auth list
pac auth create --environment https://org06e85c00.crm4.dynamics.com
```

## Design System

The app follows the VMBSO design specifications:

### Colors
- Primary: `#1a3a52` (Dark Blue)
- Secondary: `#8b95a0` (Zinc Gray)
- Text: `#333333` (Dark Gray)

### Typography
- Font Family: Inter, Roboto, Open Sans
- Base Font Size: 16px
- Heading Weights: 600-700
- Body Weight: 400

See `src/theme/theme.ts` for complete theme configuration.

## Module Implementation Status

- ✅ **Module 1**: Foundation & Project Setup
- ⏳ **Module 2**: Authentication System
- ⏳ **Module 3**: Dataverse Integration
- ⏳ **Module 4**: Document List with MUI DataGrid
- ⏳ **Module 5**: Multi-Language Support (i18n)
- ⏳ **Module 6**: Download Integration & User Profile
- ⏳ **Module 7**: Deployment & Polish

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **react-i18next** - Internationalization
- **react-toastify** - Toast notifications
- **date-fns** - Date formatting
- **Power Pages** - Hosting and authentication
- **Dataverse Web API** - Data access

## Contributing

This is an internal VMBSO project. Follow the module-by-module implementation guide.

## License

© 2026 VM Building Solutions. All rights reserved.
