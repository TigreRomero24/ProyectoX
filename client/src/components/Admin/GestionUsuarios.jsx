import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Admin.css';

export default function GestionUsuarios() {
    const { token } = useAuth();
    const [usuarios, setUsuarios] = useState([
        { id: 1, correo_institucional: 'estudiante1@ejemplo.com', rol: 'ESTUDIANTE' },
        { id: 2, correo_institucional: 'estudiante2@ejemplo.com', rol: 'ESTUDIANTE' }
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Cargar usuarios desde API
        // const fetchUsuarios = async () => {
        //     try {
        //         const response = await fetch('http://localhost:3000/api/usuarios', {
        //             headers: { 'Authorization': `Bearer ${token}` }
        //         });
        //         const data = await response.json();
        //         if (data.ok) {
        //             setUsuarios(data.usuarios);
        //         }
        //     } catch (error) {
        //         console.error('Error cargando usuarios:', error);
        //     }
        // };
        // fetchUsuarios();
    }, [token]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
        
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.ok) {
                setUsuarios(usuarios.filter(u => u.id !== id));
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gestion-usuarios">
            <h3>Usuarios Registrados</h3>
            
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Correo Institucional</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id}>
                                <td>{u.id}</td>
                                <td>{u.correo_institucional}</td>
                                <td>
                                    <span className={`role-badge ${u.rol.toLowerCase()}`}>
                                        {u.rol}
                                    </span>
                                </td>
                                <td>
                                    <button 
                                        onClick={() => handleDelete(u.id)} 
                                        className="btn-delete"
                                        disabled={loading}
                                    >
                                        {loading ? 'Eliminando...' : 'Eliminar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="stats">
                <p>Total de usuarios: <strong>{usuarios.length}</strong></p>
                <p>Estudiantes: <strong>{usuarios.filter(u => u.rol === 'ESTUDIANTE').length}</strong></p>
            </div>
        </div>
    );
}
