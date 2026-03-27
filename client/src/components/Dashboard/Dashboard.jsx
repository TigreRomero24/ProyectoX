import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import MateriasList from "../Materias/MateriasList";
import Historial from "../Materias/Historial";
import GestionMaterias from "../Admin/GestionMaterias";
import GestionPreguntas from "../Admin/GestionPreguntas";
import GestionUsuarios from "../Admin/GestionUsuarios";
import GestionInscripciones from "../Admin/GestionInscripciones";
import Forum from "../Forum/Forum";
import About from "../About/About";

const useTheme = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem("eq-theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("eq-theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return [theme, toggle];
};

export default function Dashboard({ user }) {
  const [activeSection, setActiveSection] = useState("materias");
  const [theme, toggleTheme] = useTheme();
  const isAdmin = user?.rol === "ADMINISTRADOR";

  const renderSection = () => {
    switch (activeSection) {
      case "materias":            return <MateriasList />;
      case "historial":           return <Historial />;
      case "forum":               return <Forum />;
      case "about":               return <About />;
      case "admin-materias":      return isAdmin ? <GestionMaterias /> : <MateriasList />;
      case "admin-preguntas":     return isAdmin ? <GestionPreguntas /> : <MateriasList />;
      case "admin-usuarios":      return isAdmin ? <GestionUsuarios /> : <MateriasList />;
      case "admin-inscripciones": return isAdmin ? <GestionInscripciones /> : <MateriasList />;
      default:                    return <MateriasList />;
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="app-content">
        <div className="content-wrapper">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
