# Stream Manager Frontend

A professional dashboard frontend for managing streaming channels, EPG files, users, and monitoring stream health.

## Features

- 🔐 **Authentication** - Secure login with JWT tokens
- 📺 **Channel Management** - Create, update, and delete streaming channels
- 📄 **EPG Files** - Upload and manage Electronic Program Guide files
- 👥 **User Management** - Admin-only user management with role-based access
- 📊 **Real-time Monitoring** - Live stream status monitoring with Socket.IO
- 🖥️ **System Information** - Health checks and system metrics
- 🎨 **Modern UI** - Professional dashboard built with Tailwind CSS

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time updates
- **React Icons** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:3050/api/v1
VITE_SOCKET_URL=http://localhost:3050
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Layout/         # Layout components (Sidebar, Header, etc.)
│   ├── Channels/       # Channel-related components
│   ├── EPG/           # EPG-related components
│   ├── Users/         # User-related components
│   └── Monitoring/    # Monitoring components
├── pages/             # Page components
├── services/          # API and service functions
├── context/           # React context providers
├── utils/             # Utility functions
└── App.jsx           # Main app component with routing
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features Overview

### Dashboard
- Overview statistics
- System health status
- Quick access to all features

### Channels
- List all channels with pagination
- Create new channels
- Edit channel details
- Delete channels
- Search functionality

### EPG Files
- Upload Excel EPG files
- View all EPG files
- Download converted files (SwiftTv, YuppTv, DistroTv)
- Delete EPG files

### Monitoring
- Real-time stream status
- Live channel logs
- Stream health indicators
- Freeze and dark screen detection

### Users (Admin Only)
- List all users
- Create new users
- Edit user details
- Delete users
- Role and permission management

### System Info
- System health metrics
- Memory usage
- Database status
- CPU information
- Log cleanup (Admin only)

## Authentication

The app uses JWT tokens stored in localStorage. Tokens are automatically included in API requests via axios interceptors.

## Real-time Updates

Socket.IO is used for real-time stream monitoring. The socket connection is established on login and maintained throughout the session.

## License

ISC
