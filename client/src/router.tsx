import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { GalleryPage } from './pages/GalleryPage';
import { UploadPage } from './pages/UploadPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/gallery" replace /> },
      { path: '/gallery', element: <GalleryPage /> },
      { path: '/upload', element: <UploadPage /> },
    ],
  },
]);
