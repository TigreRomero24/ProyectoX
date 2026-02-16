import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';
import '../../styles/global.css';

export default function Register({ onLoginClick }) {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { register, loading } = useAuth();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const result = await register(correo, password, passwordConfirm);
        
        if (result.ok) {
            setSuccess(result.mensaje);
            setCorreo('');
            setPassword('');
            setPasswordConfirm('');
            setTimeout(() => onLoginClick(), 2000);
        } else {
            setError(result.mensaje || 'Error en el registro');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>EduQuery Registro</h1>
                {error && <div className="alert-error">{error}</div>}
                {success && <div className="alert-success">{success}</div>}
                
                <form onSubmit={handleRegister}>
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
                    <input 
                        type="password" 
                        placeholder="Confirmar Contraseña"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Registrando...' : 'Registrarse'}
                    </button>
                </form>

                <p>¿Ya tienes cuenta? 
                    <button className="link-btn" onClick={onLoginClick}>
                        Inicia sesión aquí
                    </button>
                </p>
            </div>
        </div>
    );
}
