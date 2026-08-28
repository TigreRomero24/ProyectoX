import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import MateriasList from "../Materias/MateriasList";
import Historial from "../Materias/Historial";
import GestionMaterias from "../Admin/GestionMaterias";
import GestionPreguntas from "../Admin/GestionPreguntas";
import GestionUsuarios from "../Admin/GestionUsuarios";
import GestionInscripciones from "../Admin/GestionInscripciones";
import GestionIntentos from "../Admin/GestionIntentos";
import GestionLogs from "../Admin/GestionLogs";
import About from "../About/About";
import Perfil from "../Perfil/Perfil";
import Duelo from "../Duelo/Duelo";

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
      case "duelo":                return <Duelo />;
      case "historial":           return <Historial />;
      case "about":               return <About />;
      case "perfil":              return <Perfil />;
      case "admin-materias":      return isAdmin ? <GestionMaterias /> : <MateriasList />;
      case "admin-preguntas":     return isAdmin ? <GestionPreguntas /> : <MateriasList />;
      case "admin-usuarios":      return isAdmin ? <GestionUsuarios /> : <MateriasList />;
      case "admin-inscripciones": return isAdmin ? <GestionInscripciones /> : <MateriasList />;
      case "admin-intentos":      return isAdmin ? <GestionIntentos /> : <MateriasList />;
      case "admin-logs":          return isAdmin ? <GestionLogs /> : <MateriasList />;
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
