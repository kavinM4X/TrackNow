import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MasterLayout from './components/MasterLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import FleetOverview from './pages/FleetOverview';
import SystemLogs from './pages/SystemLogs';
import SystemSettings from './pages/SystemSettings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <MasterLayout>
                  <Dashboard />
                </MasterLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/users" 
            element={
              <ProtectedRoute>
                <MasterLayout>
                  <UserManagement />
                </MasterLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/fleet" 
            element={
              <ProtectedRoute>
                <MasterLayout>
                  <FleetOverview />
                </MasterLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/logs" 
            element={
              <ProtectedRoute>
                <MasterLayout>
                  <SystemLogs />
                </MasterLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <MasterLayout>
                  <SystemSettings />
                </MasterLayout>
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
