const API_URL = 'http://localhost:3000/api';

export const api = {
    // Autenticación
    register: (correo, password) => 
        fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                correo_institucional: correo, 
                password,
                rol: 'ESTUDIANTE'
            })
        }).then(r => r.json()),

    login: (correo, password, huella) =>
        fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correo_institucional: correo,
                password,
                huella_dispositivo: huella
            })
        }).then(r => r.json()),

    // Usuarios (Admin)
    getUsuarios: (token) =>
        fetch(`${API_URL}/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),

    deleteUsuario: (id, token) =>
        fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
};