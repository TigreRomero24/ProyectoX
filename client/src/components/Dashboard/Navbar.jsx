import { useState } from "react";
import {
  BookOpen, History, MessageSquare, Info, Shield,
  LayoutGrid, ClipboardList, Users, UserCheck,
  LogOut, User, ShieldCheck, Sun, Moon, Menu, X, ChevronDown,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const NAV_ITEMS = [
  { id: "materias",  label: "Materias",   Icon: BookOpen },
  { id: "historial", label: "Historial",  Icon: History },
  { id: "forum",     label: "Foro",       Icon: MessageSquare },
  { id: "about",     label: "Acerca de",  Icon: Info },
];

const ADMIN_ITEMS = [
  { id: "admin-materias",      label: "Gestión de Materias",    Icon: LayoutGrid },
  { id: "admin-preguntas",     label: "Gestión de Preguntas",   Icon: ClipboardList },
  { id: "admin-usuarios",      label: "Gestión de Usuarios",    Icon: Users },
  { id: "admin-inscripciones", label: "Gestión de Inscripción", Icon: UserCheck },
];

export default function Navbar({ user, activeSection, setActiveSection, theme, toggleTheme }) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminDropOpen, setAdminDropOpen] = useState(false);
  const isAdmin = user?.rol === "ADMINISTRADOR";

  const handleNav = (id) => {
    setActiveSection(id);
    setMobileOpen(false);
    setAdminDropOpen(false);
  };

  const isAdminSection = activeSection?.startsWith("admin");

  return (
    <>
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="topnav-brand">
            <div className="topnav-brand-icon"><BookOpen size={18} /></div>
            <span className="topnav-brand-name">EduQuery</span>
          </div>

          <div className="topnav-links">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button key={id} className={`topnav-link${activeSection === id ? " active" : ""}`} onClick={() => handleNav(id)}>
                <Icon size={15} className="topnav-link-icon" />{label}
              </button>
            ))}
            {isAdmin && (
              <div className={`topnav-admin-group${adminDropOpen ? " open" : ""}`}
                onMouseEnter={() => setAdminDropOpen(true)}
                onMouseLeave={() => setAdminDropOpen(false)}>
                <button className={`topnav-link${isAdminSection ? " active" : ""}`} onClick={() => setAdminDropOpen(o => !o)}>
                  <Shield size={15} className="topnav-link-icon" />
                  Admin
                  <ChevronDown size={13} style={{ marginLeft: 2, transition: "transform .2s", transform: adminDropOpen ? "rotate(180deg)" : "rotate(0)" }} />
                </button>
                <div className="topnav-admin-dropdown">
                  {ADMIN_ITEMS.map(({ id, label, Icon }) => (
                    <button key={id} className={`topnav-dropdown-item${activeSection === id ? " active" : ""}`} onClick={() => handleNav(id)}>
                      <Icon size={15} />{label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="topnav-right">
            <button className="topnav-theme-btn" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user?.rol && (
              <div className={`topnav-role-badge${isAdmin ? " topnav-role-badge--admin" : " topnav-role-badge--student"}`}>
                {isAdmin ? <ShieldCheck size={11} /> : <User size={11} />}
                {user.rol}
              </div>
            )}
            <div className="topnav-avatar" title={user?.nombre || user?.correo}><User size={16} /></div>
            <button className="topnav-logout" onClick={logout}><LogOut size={15} /><span>Salir</span></button>
            <button className="topnav-hamburger" onClick={() => setMobileOpen(o => !o)} style={{ display: "flex" }}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      <div className={`topnav-mobile-overlay${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />
      <div className={`topnav-mobile-drawer${mobileOpen ? " open" : ""}`}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", marginBottom:8, background:"var(--bg-muted)", borderRadius:"var(--radius-md)" }}>
          <div style={{ width:36, height:36, background:"var(--c-brand-600)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}>
            <User size={16} />
          </div>
          <div>
            <div style={{ fontSize:"var(--text-sm)", fontWeight:700, color:"var(--text-primary)" }}>{user?.nombre || "Usuario"}</div>
            <div style={{ fontSize:"var(--text-xs)", color:"var(--text-muted)" }}>{user?.rol}</div>
          </div>
        </div>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button key={id} className={`topnav-mobile-link${activeSection === id ? " active" : ""}`} onClick={() => handleNav(id)}>
            <Icon size={16} />{label}
          </button>
        ))}
        {isAdmin && (<>
          <hr className="topnav-mobile-divider" />
          <div className="topnav-mobile-section-label">Administración</div>
          {ADMIN_ITEMS.map(({ id, label, Icon }) => (
            <button key={id} className={`topnav-mobile-link${activeSection === id ? " active" : ""}`} onClick={() => handleNav(id)}>
              <Icon size={16} />{label}
            </button>
          ))}
        </>)}
        <hr className="topnav-mobile-divider" />
        <button className="topnav-mobile-link" onClick={() => { toggleTheme(); setMobileOpen(false); }}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
        <button className="topnav-mobile-link" onClick={logout} style={{ color: "var(--c-error-txt)" }}>
          <LogOut size={16} />Cerrar Sesión
        </button>
      </div>
    </>
  );
}
