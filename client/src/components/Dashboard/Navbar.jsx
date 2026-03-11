import { useAuth } from "../../hooks/useAuth";
import { LogOut, ShieldCheck, User, BookOpen, Menu } from "lucide-react";
import "./Dashboard.css";

const MODULO_NOMBRES = {
  materias: "Materias",
  historial: "Mi Historial",
  forum: "Foro",
  about: "Acerca de",
  "admin-materias": "Gestión de Materias",
  "admin-preguntas": "Gestión de Preguntas",
  "admin-usuarios": "Gestión de Usuarios",
  "admin-inscripciones": "Gestión de Inscripción",
};

export default function Navbar({ user, activeSection, onMenuToggle }) {
  const { logout } = useAuth();
  const esAdmin = user?.rol === "ADMINISTRADOR";
  const modulo = MODULO_NOMBRES[activeSection] || "EduQuery";

  return (
    <nav className="navbar">
      <div className="navbar-brand-block">
        <div className="navbar-brand-icon">
          <BookOpen size={18} />
        </div>
        <span className="navbar-brand-name">EduQuery</span>
      </div>

      <div className="navbar-main">
        {/* Hamburguesa solo en móvil */}
        <button
          className="navbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Menú"
        >
          <Menu size={20} />
        </button>

        <h2 className="navbar-module">{modulo}</h2>

        <div className="navbar-right">
          {user?.rol && (
            <div
              className={`navbar-rol-badge${esAdmin ? " navbar-rol-badge--admin" : " navbar-rol-badge--student"}`}
            >
              {esAdmin ? <ShieldCheck size={13} /> : <User size={13} />}
              <span>{user.rol}</span>
            </div>
          )}

          <div className="navbar-avatar">
            <User size={16} />
          </div>

          <button className="navbar-logout" onClick={logout}>
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
