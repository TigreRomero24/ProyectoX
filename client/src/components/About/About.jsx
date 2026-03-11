import {
  Code2,
  Users,
  Heart,
  GraduationCap,
  Shield,
  ClipboardList,
  BookOpen,
  MessageSquare,
  Settings,
  Mail,
  Phone,
  LifeBuoy,
} from "lucide-react";
import "./About.css";

export default function About() {
  return (
    <div className="ab-root">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="ab-hero">
        <div className="ab-hero-icon">
          <GraduationCap size={40} />
        </div>
        <h1 className="ab-hero-title">EduQuery</h1>
        <p className="ab-hero-desc">
          Plataforma educativa inteligente para la gestión de evaluaciones y
          bancos de preguntas de la Universidad Estatal de Milagro.
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="ab-stats">
        <div className="ab-stat">
          <Code2 size={22} className="ab-stat-icon" />
          <span className="ab-stat-val">v2.1.0</span>
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
      </div>

      {/* ── Qué es ───────────────────────────────────────────────────── */}
      <div className="ab-section">
        <h2 className="ab-section-title">¿Qué es EduQuery?</h2>
        <p className="ab-section-text">
          EduQuery es una plataforma educativa integral diseñada para facilitar
          el aprendizaje y la evaluación de estudiantes universitarios. Combina
          tecnología moderna con prácticas pedagógicas efectivas para crear una
          experiencia de aprendizaje óptima, segura y accesible desde cualquier
          dispositivo institucional.
        </p>
      </div>

      {/* ── Características ──────────────────────────────────────────── */}
      <div className="ab-section">
        <h2 className="ab-section-title">Características principales</h2>
        <div className="ab-features">
          {[
            {
              icon: <BookOpen size={20} />,
              color: "blue",
              titulo: "Modo Evaluación",
              desc: "Práctica sin límite de tiempo con feedback inmediato en cada respuesta.",
            },
            {
              icon: <ClipboardList size={20} />,
              color: "green",
              titulo: "Modo Examen",
              desc: "Evaluaciones temporizadas y cronometradas con calificación automática al finalizar.",
            },
            {
              icon: <MessageSquare size={20} />,
              color: "purple",
              titulo: "Foro de Discusión",
              desc: "Espacio colaborativo para compartir dudas, respuestas y conocimientos entre pares.",
            },
            {
              icon: <Settings size={20} />,
              color: "orange",
              titulo: "Panel Admin",
              desc: "Gestión completa de materias, preguntas, usuarios e inscripciones.",
            },
            {
              icon: <Shield size={20} />,
              color: "red",
              titulo: "Seguridad",
              desc: "Autenticación institucional OAuth con control de sesiones y dispositivos.",
            },
            {
              icon: <Users size={20} />,
              color: "teal",
              titulo: "Multi-rol",
              desc: "Perfiles diferenciados para estudiantes y administradores con accesos específicos.",
            },
          ].map((f, i) => (
            <div key={i} className={`ab-feature ab-feature--${f.color}`}>
              <div className={`ab-feature-icon ab-feature-icon--${f.color}`}>
                {f.icon}
              </div>
              <div>
                <h4 className="ab-feature-title">{f.titulo}</h4>
                <p className="ab-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seguridad ────────────────────────────────────────────────── */}
      <div className="ab-section">
        <h2 className="ab-section-title">Seguridad y privacidad</h2>
        <div className="ab-security">
          {[
            "Autenticación exclusiva con correo institucional @unemi.edu.ec",
            "Control de sesiones activas por dispositivo registrado",
            "Identificación de dispositivo mediante fingerprint único",
            "Registro de IP y actividad en cada acceso al sistema",
            "Tokens JWT con rotación automática y expiración configurable",
            "Protección de datos personales conforme a normativa institucional",
          ].map((item, i) => (
            <div key={i} className="ab-security-item">
              <Shield size={15} className="ab-security-icon" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Soporte ──────────────────────────────────────────────────── */}
      <div className="ab-section">
        <h2 className="ab-section-title">Soporte y contacto</h2>
        <div className="ab-support">
          <div className="ab-support-card">
            <Mail size={22} className="ab-support-icon" />
            <div>
              <h4>Correo electrónico</h4>
              <p>soporte@eduquery.unemi.edu.ec</p>
            </div>
          </div>
          <div className="ab-support-card">
            <MessageSquare size={22} className="ab-support-icon" />
            <div>
              <h4>Foro de la plataforma</h4>
              <p>Consultas académicas y técnicas entre la comunidad</p>
            </div>
          </div>
          <div className="ab-support-card">
            <Phone size={22} className="ab-support-icon" />
            <div>
              <h4>Departamento de TI</h4>
              <p>Soporte técnico presencial en mi casa </p>
            </div>
          </div>
          <div className="ab-support-card">
            <LifeBuoy size={22} className="ab-support-icon" />
            <div>
              <h4>Centro de ayuda</h4>
              <p>Documentación y guías de usuario disponibles en línea</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="ab-footer">
        <p className="ab-footer-tech">
          Desarrollado con React, Node.js, PostgreSQL y Sequelize.
        </p>
        <p className="ab-footer-copy">
          © 2026 EduQuery Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
