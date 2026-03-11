import { useState } from "react";
import {
  BookOpen,
  History,
  MessageSquare,
  Info,
  Shield,
  ChevronRight,
  LayoutGrid,
  Users,
  ClipboardList,
  UserCheck,
} from "lucide-react";
import "./Dashboard.css";

const NAV_ITEMS = [
  { id: "materias", label: "Materias", Icon: BookOpen },
  { id: "historial", label: "Historial", Icon: History },
  { id: "forum", label: "Foro", Icon: MessageSquare },
  { id: "about", label: "Acerca de", Icon: Info },
];

const ADMIN_ITEMS = [
  { id: "admin-materias", label: "Gestión de Materias", Icon: LayoutGrid },
  { id: "admin-preguntas", label: "Gestión de Preguntas", Icon: ClipboardList },
  { id: "admin-usuarios", label: "Gestión de Usuarios", Icon: Users },
  {
    id: "admin-inscripciones",
    label: "Gestión de Inscripción",
    Icon: UserCheck,
  },
];

export default function Sidebar({
  activeSection,
  setActiveSection,
  userRole,
  mobileOpen,
  onClose,
}) {
  const isAdminActive = activeSection?.startsWith("admin");
  const [adminOpen, setAdminOpen] = useState(isAdminActive);

  const handleNav = (id) => {
    setActiveSection(id);
    if (!id.startsWith("admin")) setAdminOpen(false);
    onClose?.();
  };

  return (
    <>
      <div
        className={`sidebar-overlay${mobileOpen ? " sidebar-overlay--visible" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar${mobileOpen ? " sidebar--mobile-open" : ""}`}>
        {/* Menú — sin brand, empieza directo */}
        <nav className="sidebar-menu">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`sidebar-item${activeSection === id ? " sidebar-item--active" : ""}`}
              onClick={() => handleNav(id)}
            >
              <Icon size={17} className="sidebar-item-icon" />
              <span>{label}</span>
            </button>
          ))}

          {userRole === "ADMINISTRADOR" && (
            <div className="sidebar-group">
              <button
                className={`sidebar-item${isAdminActive ? " sidebar-item--active" : ""}`}
                onClick={() => setAdminOpen((o) => !o)}
              >
                <Shield size={17} className="sidebar-item-icon" />
                <span>Panel Admin</span>
                <ChevronRight
                  size={14}
                  className={`sidebar-chevron${adminOpen ? " sidebar-chevron--open" : ""}`}
                />
              </button>

              <div
                className={`sidebar-sub${adminOpen ? " sidebar-sub--open" : ""}`}
              >
                {ADMIN_ITEMS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className={`sidebar-subitem${activeSection === id ? " sidebar-subitem--active" : ""}`}
                    onClick={() => handleNav(id)}
                  >
                    <Icon size={13} className="sidebar-item-icon" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-version">EduQuery v2.1.0</span>
        </div>
      </aside>
    </>
  );
}
