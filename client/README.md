# DICOM X-Ray Annotation System - Frontend

React-based frontend for the DICOM annotation system with comprehensive file management, viewing, and analytics capabilities.

## ✅ Implemented Features

### Core Infrastructure
- ✅ TypeScript types for all API responses
- ✅ Axios API client with JWT authentication
- ✅ Automatic token refresh on 401 errors
- ✅ LocalStorage token management
- ✅ Redux store with auth, dicoms, and annotations slices

### Authentication
- ✅ Login and registration forms
- ✅ JWT token-based authentication
- ✅ Private route protection
- ✅ Automatic redirect to login for unauthenticated users

### File Management
- ✅ DICOM file upload with metadata (patient ID, study date, modality, body part)
- ✅ File listing in table format
- ✅ File deletion with confirmation
- ✅ Navigation to viewer per file

### Analytics
- ✅ Summary cards (total files, annotations, verified/unverified counts)
- ✅ Annotations by type visualization
- ✅ Annotations by label visualization
- ✅ AI vs manual annotations breakdown
- ✅ Recent activity feed

### Viewer (Basic - Cornerstone Integration Pending)
- ✅ DICOM file metadata display
- ✅ Annotations sidebar
- ✅ Layout prepared for Cornerstone integration

## 🚧 Pending Implementation

- ❌ Cornerstone.js DICOM rendering
- ❌ Annotation toolbar with drawing tools
- ❌ Annotation saving/editing functionality
- ❌ Viewport controls (zoom, pan, window/level)

## 📁 Project Structure

```
client/src/
├── api/               # API client and service modules
│   ├── client.ts      # Axios instance with interceptors
│   ├── auth.ts        # Authentication APIs
│   ├── dicoms.ts      # DICOM file management APIs
│   ├── annotations.ts # Annotation APIs
│   └── analytics.ts   # Analytics APIs
├── components/        # React components
│   └── Auth/          # Auth-related components
│       ├── LoginForm.tsx
│       ├── RegistrationForm.tsx
│       └── PrivateRoute.tsx
├── pages/             # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ViewerPage.tsx
│   └── AnalyticsPage.tsx
├── store/             # Redux state management
│   ├── index.ts       # Store configuration
│   ├── hooks.ts       # Typed Redux hooks
│   ├── authSlice.ts   # Authentication state
│   ├── dicomsSlice.ts # DICOM files state
│   └── annotationsSlice.ts # Annotations state
├── types/             # TypeScript types
│   └── api.types.ts   # API response/request types
├── utils/             # Utility functions
│   └── token-storage.ts # JWT token management
└── App.tsx            # Main app with routing
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend Django server running on `http://localhost:8000`

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Configure API URL:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `VITE_API_URL` to your backend URL

3. **Start development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:5173/login`

## 🔐 Authentication Flow

1. User registers or logs in
2. Backend returns JWT access & refresh tokens
3. Tokens stored in localStorage
4. Access token sent with every API request via Authorization header
5. On 401 error, client automatically tries to refresh using refresh token
6. If refresh fails, user redirected to login

## 🗂️ API Endpoints Used

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and get tokens
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token

### DICOM Files
- `POST /api/dicom` - Upload DICOM file
- `GET /api/dicom` - List user's DICOM files
- `GET /api/dicom/{id}` - Get specific file
- `GET /api/dicom/{id}/download` - Download file
- `DELETE /api/dicom/{id}` - Delete file

### Annotations
- `POST /api/annotations` - Create annotation
- `GET /api/annotations` - List annotations (with filters)
- `GET /api/annotations/{id}` - Get annotation
- `PATCH /api/annotations/{id}` - Update annotation
- `DELETE /api/annotations/{id}` - Delete annotation

### Analytics
- `GET /api/analytics/annotation-stats` - Get statistics
- `GET /api/analytics/user-stats` - Get user stats
- `GET /api/analytics/annotation-history/{id}` - Get annotation history

## 📝 Usage

### Login
1. Navigate to `/login`
2. Enter username and password
3. Click "Sign in"
4. Redirected to dashboard on success

### Register New User
1. Navigate to `/register`
2. Fill in username, email, password, and select role
3. Click "Register"
4. Automatically logged in and redirected to dashboard

### Upload DICOM File
1. From dashboard, click "Upload DICOM File"
2. Select `.dcm` file
3. Optionally enter metadata (patient ID, study date, etc.)
4. Click "Upload"
5. File appears in table

### View DICOM
1. From dashboard table, click "View" on any file
2. Opens viewer page with file metadata
3. Annotations (if any) shown in right sidebar

### Analytics
1. From dashboard header, click "Analytics"
2. View summary cards and visualizations
3. See annotations grouped by type, label, and status

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## 🔧 Configuration

### API Base URL
Set in `.env`:
```
VITE_API_URL=http://localhost:8000/api
```

### Token Expiration
Tokens are managed automatically. If access token expires:
1. Client detects 401 error
2. Attempts refresh using refresh token
3. On success, retries original request
4. On failure, redirects to login

## 📦 Dependencies

### Core
- `react` ^19.1.1
- `react-dom` ^19.1.1
- `react-router-dom` ^7.9.5  
- `@reduxjs/toolkit` ^2.10.1
- `react-redux` ^9.2.0
- `axios` ^1.13.2

### UI
- `@radix-ui/*` - UI components
- Tailwind CSS (via index.css)

### DICOM (Not Yet Integrated)
- `cornerstone-core` ^2.6.1
- `cornerstone-tools` ^6.0.10
- `cornerstone-wado-image-loader` ^4.13.2
- `dcmjs` ^0.38.0

## 🎯 Next Steps

To complete the implementation:

1. **Integrate Cornerstone.js**
   - Initialize Cornerstone in viewer page
   - Load DICOM images from backend
   - Setup viewport and rendering

2. **Implement Annotation Tools**
   - Add annotation toolbar component
   - Integrate Cornerstone Tools for drawing
   - Save annotation coordinates to backend

3. **Add Viewport Controls**
   - Zoom in/out
   - Pan
   - Window/Level adjustments
   - Reset view

4. **Testing**
   - Unit tests for components
   - Integration tests for API calls
   - E2E tests for user flows

## 🐛 Known Issues

- TypeScript strict mode may show some warnings (can be suppressed with `// @ts-ignore` if needed)
- Viewer page is currently placeholder - needs Cornerstone integration
- No error toasts/notifications yet (errors only shown in forms)

## 📄 License

Part of the DICOM Annotation System project.
