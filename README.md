# X-Ray Annotation & Data Extraction System

An advanced web application designed to streamline the workflow for radiologists and researchers. This system facilitates the management, viewing, and annotation of DICOM X-Ray images, serving as a robust platform for medical imaging data extraction.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-blue)
![Backend](https://img.shields.io/badge/Backend-Django%20%7C%20Python-green)

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Workflow](#workflow)
- [Getting Started](#getting-started)
- [Project Status](#project-status)
- [Troubleshooting](#troubleshooting)

## 📖 Overview

The X-Ray Annotation & Data Extraction System utilizes a monolithic repository structure with clear separation between the frontend and backend. It is built to support user roles, secure data handling, and sophisticated image manipulation capabilities.

## ✨ Features

### User Roles
- **Radiologists**: Can upload DICOM files, view images, create bounding-box annotations, and manage their own datasets.
- **Admins**: Have extended privileges to manage users and oversee system-wide data.

### Authentication
- **Secure JWT Authentication**: Implemented to protect API endpoints and ensure authorized access for different user roles.

## 🏗️ Architecture

### Backend (Server)
- **Framework**: Django (Python).
- **API**: Django Ninja for high-performance, type-safe APIs.
- **Database**: PostgreSQL (production) / SQLite (dev) for user data, file metadata, and annotations.
- **Role**: Manages DICOM file storage, retrieval, and metadata extraction.

### Frontend (Client)
- **Framework**: React.js with TypeScript for a robust, component-based UI.
- **Imaging Library**: Cornerstone.js for advanced medical image rendering (WADO Image Loader, DICOM parsing).
- **Capabilities**: Image manipulation (zoom, pan, window/level) and bounding-box annotations.

## 🔄 Workflow
1.  **Registration/Login**: Users access the dashboard via secure login.
2.  **Upload**: Radiologists upload DICOM files; backend extracts/stores metadata.
3.  **Selection**: Users select a DICOM file to open in the integrated Viewer.
4.  **Viewing**: Cornerstone.js renders the X-Ray image.
5.  **Annotation**: Users apply bounding-box annotations to regions of interest.
6.  **Saving**: Annotations are saved to the backend via RESTful APIs.
7.  **Review**: Users can review, edit, or delete annotations and export data.

## 🚀 Getting Started

### Backend Setup (Django)

1.  **Navigate to server directory**:
    ```bash
    cd server
    ```
2.  **Activate virtual environment**:
    - **Windows**: `.\venv\Scripts\activate`
    - **macOS/Linux**: `source venv/bin/activate`
3.  **Apply migrations**:
    ```bash
    python manage.py migrate
    ```
4.  **Create superuser (optional)**:
    ```bash
    python manage.py createsuperuser
    ```
5.  **Run Django server**:
    ```bash
    python manage.py runserver
    ```
    _Backend runs at: `http://localhost:8000`_

### Frontend Setup (React)

1.  **Navigate to client directory**:
    ```bash
    cd client
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Configure Environment**:
    ```bash
    copy .env.example .env  # Windows
    cp .env.example .env      # macOS/Linux
    ```
4.  **Start development server**:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    _Frontend runs at: `http://localhost:5173`_

## 🚦 Project Status

| Feature | Status |
| :--- | :--- |
| **Authentication** (Register/Login, JWT) | ✅ Working |
| **File Management** (Upload/Download/Delete) | ✅ Working |
| **Dashboard & Analytics** | ✅ Working |
| **DICOM Viewer** (Cornerstone.js integration) | 🔶 Partial |
| **Annotations** (Backend ready, Frontend pending) | 🔶 Partial |
| **Viewport Controls** | ❌ Not Implemented |

## 🔧 Troubleshooting

-   **Backend not starting?** Check venv activation, `pip install -r requirements.txt`, and migrations.
-   **Frontend not starting?** Check `npm install` and Node.js version (18+).
-   **Cannot login?** Verify backend is on port 8000, check `.env`, clearance `localStorage`.
-   **CORS errors?** Ensure `CORS_ALLOWED_ORIGINS` in Django includes your frontend URL.

---