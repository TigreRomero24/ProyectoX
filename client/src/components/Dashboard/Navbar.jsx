import { useAuth } from '../../hooks/useAuth';
import './Dashboard.css';

export default function Navbar({ user }) {
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="navbar-left">
                    <h2>🎓 EduQuery</h2>
                </div>
                <div className="navbar-right">
                    <span className="user-info">
                        👤 {user?.correo_institucional}
                    </span>
                    <button className="btn-logout" onClick={handleLogout}>
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </nav>
    );
}
