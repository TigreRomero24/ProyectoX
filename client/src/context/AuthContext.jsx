import { createContext, useState, useEffect } from 'react';
import { getDeviceFingerprint } from '../services/deviceFingerprint';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Cargar usuario desde localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser && token) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Error al cargar usuario:', e);
            }
        }

        // Bloquear capturas de pantalla
        const preventScreenshot = (e) => {
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                e.preventDefault();
                alert('⚠️ No se permiten capturas de pantalla');
                return false;
            }
        };

        // Bloquear Ctrl+C
        const preventCopy = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                alert('⚠️ Copiar está deshabilitado en esta aplicación');
                return false;
            }
        };

        document.addEventListener('keydown', preventScreenshot);
        document.addEventListener('keydown', preventCopy);

        return () => {
            document.removeEventListener('keydown', preventScreenshot);
            document.removeEventListener('keydown', preventCopy);
        };
    }, [token]);

    const login = async (correo, password) => {
        setLoading(true);
        setError('');
        try {
            const huella = await getDeviceFingerprint();
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo_institucional: correo,
                    password,
                    huella_dispositivo: huella
                })
            });
            const data = await response.json();

            if (data.ok) {
                setToken(data.token);
                setUser(data.usuario);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.usuario));
                return { ok: true };
            }
            setError(data.mensaje || 'Error en autenticación');
            return data;
        } catch (err) {
            setError('Error de conexión');
            return { ok: false, mensaje: 'Error de conexión' };
        } finally {
            setLoading(false);
        }
    };

    const register = async (correo, password, passwordConfirm) => {
        setLoading(true);
        setError('');
        try {
            if (password !== passwordConfirm) {
                setError('Las contraseñas no coinciden');
                return { ok: false, mensaje: 'Las contraseñas no coinciden' };
            }

            const response = await fetch('http://localhost:3000/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo_institucional: correo,
                    password,
                    rol: 'ESTUDIANTE'
                })
            });
            const data = await response.json();

            if (data.ok) {
                setError('');
                return { ok: true, mensaje: 'Registro exitoso. Por favor inicia sesión.' };
            }
            setError(data.mensaje || 'Error en el registro');
            return data;
        } catch (err) {
            setError('Error de conexión');
            return { ok: false, mensaje: 'Error de conexión' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};