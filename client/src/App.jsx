import { useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import './styles/global.css';

function AppContent() {
    const { user, token } = useAuth();
    const [authMode, setAuthMode] = useState('login');

    if (!token) {
        return authMode === 'login' 
            ? <Login onRegisterClick={() => setAuthMode('register')} />
            : <Register onLoginClick={() => setAuthMode('login')} />;
    }

    return <Dashboard user={user} />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
