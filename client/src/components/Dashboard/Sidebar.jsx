import "./Dashboard.css";

export default function Sidebar({ activeSection, setActiveSection, userRole }) {
  const handleNavigation = (section) => {
    setActiveSection(section);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        <button
          className={`menu-btn ${activeSection === "materias" ? "active" : ""}`}
          onClick={() => handleNavigation("materias")}
        >
          📚 Materias
        </button>

        <button
          className={`menu-btn ${activeSection === "forum" ? "active" : ""}`}
          onClick={() => handleNavigation("forum")}
        >
          💬 Foro
        </button>

        {userRole === "ADMINISTRADOR" && (
          <button
            className={`menu-btn admin ${activeSection === "admin" ? "active" : ""}`}
            onClick={() => handleNavigation("admin")}
          >
            ⚙️ Panel Admin
          </button>
        )}

        <button
          className={`menu-btn ${activeSection === "about" ? "active" : ""}`}
          onClick={() => handleNavigation("about")}
        >
          ℹ️ Acerca de
        </button>
      </div>
    </aside>
  );
}
