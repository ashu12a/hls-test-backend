# Quick Start Guide

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:3050/api/v1
   VITE_SOCKET_URL=http://localhost:3050
   ```
   
   **Note:** Update these URLs if your backend is running on a different host/port.

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`

## Default Login

You'll need to create a user account through your backend API first, or use an existing admin account.

## Features Overview

### 🔐 Authentication
- Login page with email/password
- JWT token-based authentication
- Protected routes
- Role-based access control

### 📺 Channels Management
- View all channels with pagination
- Create new channels
- Edit channel details (name, language, type, URLs, etc.)
- Delete channels
- Search functionality

### 📄 EPG Files
- Upload Excel EPG files
- View all uploaded EPG files
- Download converted files:
  - SwiftTv.xlsx
  - YuppTv.xlsx
  - DistroTv.xml
- Delete EPG files

### 👥 User Management (Admin Only)
- View all users
- Create new users
- Edit user details and permissions
- Delete users
- Role management (admin/user)

### 📊 Real-time Monitoring
- Live stream status monitoring
- View channel logs in real-time
- Stream health indicators
- Freeze and dark screen detection

### 🖥️ System Information
- System health metrics
- Memory usage statistics
- Database connection status
- CPU information
- Log cleanup (Admin only)

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── context/        # React context providers
│   ├── utils/         # Utility functions
│   └── App.jsx        # Main app with routing
├── public/            # Static assets
├── .env              # Environment variables
└── package.json      # Dependencies
```

## Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Troubleshooting

### Socket Connection Issues
- Ensure the backend Socket.IO server is running
- Check that `VITE_SOCKET_URL` matches your backend URL
- Verify CORS settings on the backend

### API Connection Issues
- Verify `VITE_API_URL` is correct
- Check that the backend server is running
- Ensure CORS is properly configured on the backend

### Authentication Issues
- Clear localStorage if experiencing token issues
- Verify JWT_SECRET matches between frontend and backend
- Check browser console for error messages

## Support

For issues or questions, check the backend API documentation or logs.

