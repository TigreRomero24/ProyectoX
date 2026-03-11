import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MateriasList from "../Materias/MateriasList";
import Historial from "../Materias/Historial";
import GestionMaterias from "../Admin/GestionMaterias";
import GestionPreguntas from "../Admin/GestionPreguntas";
import GestionUsuarios from "../Admin/GestionUsuarios";
import GestionInscripciones from "../Admin/GestionInscripciones";
import Forum from "../Forum/Forum";
import About from "../About/About";
import "./Dashboard.css";

export default function Dashboard({ user }) {
  const [activeSection, setActiveSection] = useState("materias");
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const isAdmin = user?.rol === "ADMINISTRADOR";

  const renderSection = () => {
    switch (activeSection) {
      case "materias":
        return <MateriasList />;
      case "historial":
        return <Historial />;
      case "forum":
        return <Forum />;
      case "about":
        return <About />;
      case "admin-materias":
        return isAdmin ? <GestionMaterias /> : <MateriasList />;
      case "admin-preguntas":
        return isAdmin ? <GestionPreguntas /> : <MateriasList />;
      case "admin-usuarios":
        return isAdmin ? <GestionUsuarios /> : <MateriasList />;
      case "admin-inscripciones":
        return isAdmin ? <GestionInscripciones /> : <MateriasList />;
      default:
        return <MateriasList />;
    }
  };

  return (
    <div className="dashboard">
      <Navbar
        user={user}
        activeSection={activeSection}
        onMenuToggle={() => setSidebarMobile((o) => !o)}
      />
      <div className="dashboard-body">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          userRole={user?.rol}
          mobileOpen={sidebarMobile}
          onClose={() => setSidebarMobile(false)}
        />
        <main className="dashboard-content">{renderSection()}</main>
      </div>
    </div>
  );
}
