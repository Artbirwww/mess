import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ChatPage from './pages/Chat/Chat';
import ProfileLayout from './pages/Profile/ProfileLayout';
import Profile from './pages/Profile/Profile';
import ProfileSettings from './pages/Profile/ProfileSettings';
import './App.css';

//

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/mess">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Profile />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
