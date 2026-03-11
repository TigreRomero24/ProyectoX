import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import Login from './components/Auth/Login.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import './styles/global.css';

function AppContent() {
    const { user, token } = useAuth();

    if (!token) {
        return <Login />;
    }

    return <Dashboard user={user} token={token} />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
