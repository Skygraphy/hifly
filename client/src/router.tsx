import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { GalleryPage } from './pages/GalleryPage';
import { UploadPage } from './pages/UploadPage';
import { HomePage } from './pages/HomePage';
import { PublicGalleryPage } from './pages/PublicGalleryPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminRegionsPage } from './pages/AdminRegionsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminSyncPage } from './pages/AdminSyncPage';
import { AccountPage } from './pages/AccountPage';

export const router = createBrowserRouter([
  // Public routes
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/home', element: <HomePage /> },
  { path: '/gallery', element: <PublicGalleryPage /> },
  { path: '/login', element: <LoginPage /> },

  // /admin → /admin/manage
  { path: '/admin', element: <Navigate to="/admin/manage" replace /> },

  // Any logged-in user
  {
    element: <AppShell />,
    children: [
      { path: '/account', element: <AccountPage /> },
    ],
  },

  // Admin + Super-Admin
  {
    element: <AppShell require="admin" />,
    children: [
      { path: '/admin/manage', element: <GalleryPage /> },
      { path: '/admin/upload', element: <UploadPage /> },
      { path: '/admin/settings', element: <AdminSettingsPage /> },
    ],
  },

  // Super-admin only
  {
    element: <AppShell require="super_admin" />,
    children: [
      { path: '/admin/users', element: <AdminUsersPage /> },
      { path: '/admin/regions', element: <AdminRegionsPage /> },
      { path: '/admin/sync', element: <AdminSyncPage /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/home" replace /> },
]);
