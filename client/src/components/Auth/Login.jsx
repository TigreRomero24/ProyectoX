import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';
import '../../styles/global.css';

export default function Login({ onRegisterClick }) {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        const result = await login(correo, password);
        
        if (!result.ok) {
            setError(result.mensaje || 'Error en autenticación');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>EduQuery Login</h1>
                {error && <div className="alert-error">{error}</div>}
                
                <form onSubmit={handleLogin}>
                    <input 
                        type="email" 
                        placeholder="Correo Institucional"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Autenticando...' : 'Ingresar'}
                    </button>
                </form>

                <p>¿No tienes cuenta? 
                    <button className="link-btn" onClick={onRegisterClick}>
                        Registrate aquí
                    </button>
                </p>
            </div>
        </div>
    );
}