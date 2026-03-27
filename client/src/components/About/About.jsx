import {
  Code2, Users, Heart, GraduationCap, Shield,
  ClipboardList, BookOpen, MessageSquare, Settings,
  Mail, Phone, LifeBuoy, CheckCircle2, Zap, Lock,
} from "lucide-react";
import "./About.css";

const FEATURES = [
  { Icon: BookOpen,     color: "#2563eb", bg: "#eff6ff", title: "Banco de preguntas",   desc: "Gestión completa de preguntas con múltiples tipos y configuraciones." },
  { Icon: ClipboardList,color: "#059669", bg: "#f0fdf4", title: "Modos de evaluación",  desc: "Modo Test con feedback inmediato y Modo Examen con calificación final." },
  { Icon: Shield,       color: "#7c3aed", bg: "#f5f3ff", title: "Seguridad robusta",    desc: "Autenticación OAuth2 con Google y control de roles por usuario." },
  { Icon: MessageSquare,color: "#0284c7", bg: "#f0f9ff", title: "Foro académico",       desc: "Espacio colaborativo para resolver dudas entre estudiantes." },
  { Icon: Settings,     color: "#b45309", bg: "#fef3c7", title: "Panel de administración", desc: "Gestión de materias, preguntas, usuarios e inscripciones." },
  { Icon: Zap,          color: "#e11d48", bg: "#fff1f2", title: "Tiempo real",           desc: "Actualizaciones instantáneas y experiencia fluida sin recargas." },
];

const TECH = [
  { label: "React 19",      color: "#61dafb" },
  { label: "Node.js",       color: "#4caf50" },
  { label: "PostgreSQL",    color: "#336791" },
  { label: "Sequelize",     color: "#52b0e7" },
  { label: "Passport.js",   color: "#34e27a" },
  { label: "Vite",          color: "#646cff" },
  { label: "Docker",        color: "#2496ed" },
  { label: "JWT / OAuth2",  color: "#f59e0b" },
];

export default function About() {
  return (
    <div className="ab-root">
      {/* Hero */}
      <div className="ab-hero">
        <div className="ab-hero-icon">
          <GraduationCap size={36} />
        </div>
        <h1 className="ab-hero-title">EduQuery</h1>
        <p className="ab-hero-desc">
          Plataforma educativa inteligente para la gestión de evaluaciones y bancos
          de preguntas de la Universidad Estatal de Milagro.
        </p>
      </div>

      {/* Stats */}
      <div className="ab-stats">
        <div className="ab-stat">
          <Code2 size={22} className="ab-stat-icon" />
          <span className="ab-stat-val">v2.1</span>
          <span className="ab-stat-label">Versión</span>
        </div>
        <div className="ab-stat-sep" />
        <div className="ab-stat">
          <Users size={22} className="ab-stat-icon" />
          <span className="ab-stat-val">1,250+</span>
          <span className="ab-stat-label">Usuarios</span>
        </div>
        <div className="ab-stat-sep" />
        <div className="ab-stat">
          <Heart size={22} className="ab-stat-icon" />
          <span className="ab-stat-val">98%</span>
          <span className="ab-stat-label">Satisfacción</span>
        </div>
        <div className="ab-stat-sep" />
        <div className="ab-stat">
          <ClipboardList size={22} className="ab-stat-icon" />
          <span className="ab-stat-val">5,000+</span>
          <span className="ab-stat-label">Evaluaciones</span>
        </div>
      </div>

      {/* Grid de secciones */}
      <div className="ab-grid">
        {/* Qué es */}
        <div className="ab-section">
          <div className="ab-section-header">
            <div className="ab-section-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <BookOpen size={20} />
            </div>
            <h2 className="ab-section-title">¿Qué es EduQuery?</h2>
          </div>
          <p className="ab-section-text">
            EduQuery es una plataforma educativa integral diseñada para facilitar el aprendizaje
            y la evaluación de estudiantes universitarios. Combina tecnología moderna con
            prácticas pedagógicas efectivas para crear una experiencia de aprendizaje óptima,
            segura y accesible desde cualquier dispositivo.
          </p>
        </div>

        {/* Stack tecnológico */}
        <div className="ab-section">
          <div className="ab-section-header">
            <div className="ab-section-icon" style={{ background: "#fef3c7", color: "#b45309" }}>
              <Code2 size={20} />
            </div>
            <h2 className="ab-section-title">Stack tecnológico</h2>
          </div>
          <div className="ab-tech-grid">
            {TECH.map(({ label, color }) => (
              <span key={label} className="ab-tech-chip">
                <span className="ab-tech-chip-dot" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Funcionalidades */}
      <div className="ab-section" style={{ marginBottom: 20 }}>
        <div className="ab-section-header">
          <div className="ab-section-icon" style={{ background: "#f0fdf4", color: "#059669" }}>
            <CheckCircle2 size={20} />
          </div>
          <h2 className="ab-section-title">Funcionalidades principales</h2>
        </div>
        <ul className="ab-feature-list">
          {FEATURES.map(({ Icon, color, bg, title, desc }) => (
            <li key={title} className="ab-feature-item">
              <div className="ab-feature-icon" style={{ background: bg, color }}>
                <Icon size={15} />
              </div>
              <span className="ab-feature-text">
                <span className="ab-feature-title">{title}</span>
                {desc}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Contacto */}
      <div className="ab-section" style={{ marginBottom: 20 }}>
        <div className="ab-section-header">
          <div className="ab-section-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
            <LifeBuoy size={20} />
          </div>
          <h2 className="ab-section-title">Soporte y contacto</h2>
        </div>
        <div className="ab-contact-list">
          <div className="ab-contact-item">
            <Mail size={16} className="ab-contact-icon" />
            soporte@unemi.edu.ec
          </div>
          <div className="ab-contact-item">
            <Phone size={16} className="ab-contact-icon" />
            +593 (4) 2693096 ext. 1234
          </div>
          <div className="ab-contact-item">
            <Lock size={16} className="ab-contact-icon" />
            Solo cuentas institucionales @unemi.edu.ec
          </div>
        </div>
      </div>

      {/* Versión */}
      <div className="ab-version-card">
        <div>
          <p className="ab-version-label">Versión actual</p>
          <p className="ab-version-val">EduQuery v2.1.0</p>
        </div>
        <div className="ab-version-badge">
          <CheckCircle2 size={13} />
          Producción estable
        </div>
      </div>
    </div>
  );
}
