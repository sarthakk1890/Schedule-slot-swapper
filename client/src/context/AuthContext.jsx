import React, { createContext, useState, useEffect } from 'react';
import request from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    useEffect(() => {
        if (user) localStorage.setItem('user', JSON.stringify(user));
    }, [user]);

    useEffect(() => {
        if (token) localStorage.setItem('token', token);
        else localStorage.removeItem('token');
    }, [token]);

    const login = async (email, password) => {
        const data = await request('/auth/login', { method: 'POST', body: { email, password } });
        setToken(data.token);
        setUser(data.user);
    };

    const signup = async (name, email, password) => {
        const data = await request('/auth/signup', { method: 'POST', body: { name, email, password } });
        setToken(data.token);
        setUser(data.user);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
