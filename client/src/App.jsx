import React, { useContext } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Requests from './pages/Requests';
import { AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <>
      <nav className="flex gap-4 px-4 py-3 bg-white shadow-sm items-center">
        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">Home</Link>
        {user && <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">Dashboard</Link>}
        {user && <Link to="/marketplace" className="text-blue-600 hover:text-blue-800 font-medium">Marketplace</Link>}
        {user && <Link to="/requests" className="text-blue-600 hover:text-blue-800 font-medium">Requests</Link>}
        {!user && <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">Login</Link>}
        {!user && <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">Signup</Link>}
        {user && (
          <button
            onClick={logout}
            className="ml-auto bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        )}
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-4">
        <Routes>
          <Route path="/"
            element={
              <h2 className="text-3xl font-bold text-center text-gray-800">
                Welcome to SlotSwapper
              </h2>
            } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/marketplace"
            element={<ProtectedRoute><Marketplace /></ProtectedRoute>}
          />
          <Route
            path="/requests"
            element={<ProtectedRoute><Requests /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
