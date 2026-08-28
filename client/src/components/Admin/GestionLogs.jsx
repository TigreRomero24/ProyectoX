import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  ChevronDown,
  Download,
  Calendar,
  Clock,
  User,
  Shield,
  Activity,
  AlertTriangle,
  Info,
  Globe,
  Mail,
} from "lucide-react";
import { api } from "../../services/api";
import "./AdminEstilos/GestionLogs.css";

const formatFecha = (str) => {
  if (!str) return "-";
  const date = new Date(str);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatHora = (str) => {
  if (!str) return "-";
  const date = new Date(str);
  return date.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getSeverityClass = (sev) => {
  switch (sev?.toUpperCase()) {
    case "CRITICAL":
      return "log-sev--critical";
    case "HIGH":
      return "log-sev--high";
    case "MEDIUM":
      return "log-sev--medium";
    case "LOW":
      return "log-sev--low";
    default:
      return "log-sev--low";
  }
};

const getSeverityIcon = (sev) => {
  switch (sev?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return <ShieldAlert size={14} />;
    case "MEDIUM":
      return <AlertTriangle size={14} />;
    default:
      return <Info size={14} />;
  }
};

export default function GestionLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("todos");
  const [filtroSeveridad, setFiltroSeveridad] = useState("todas");

  useEffect(() => {
    cargarLogs();
  }, []);

  const cargarLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getSecurityLogs();
      if (res.ok) {
        setLogs(res.data);
      } else {
        setError(res.error || "Error al cargar logs");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const eventosUnicos = [...new Set(logs.map((l) => l.event))].sort();

  const logsFiltrados = logs.filter((l) => {
    const matchBusq =
      busqueda === "" ||
      (l.user && l.user.toLowerCase().includes(busqueda.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(busqueda.toLowerCase())) ||
      (l.ip && l.ip.toLowerCase().includes(busqueda.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(busqueda.toLowerCase()));
    const matchEv = filtroEvento === "todos" || l.event === filtroEvento;
    const matchSev =
      filtroSeveridad === "todas" || l.severity === filtroSeveridad;
    return matchBusq && matchEv && matchSev;
  });

  const exportarLogs = () => {
    // Implementar exportación simple a CSV o similar si es necesario
    alert("Función de exportación en desarrollo");
  };

  return (
    <div className="log-root">
      <div className="log-header">
        <div>
          <h2 className="log-titulo">Logs de Seguridad</h2>
          <p className="log-subtitulo">
            Monitoreo de eventos y actividades del sistema
          </p>
        </div>
        <button className="log-btn log-btn--export" onClick={exportarLogs}>
          <Download size={15} /> Exportar
        </button>
      </div>

      <div className="log-filtros-wrap">
        <div className="log-search">
          <Search size={16} className="log-search-icon" />
          <input
            placeholder="Buscar por usuario, email, IP o detalles..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="log-select-wrap">
          <select
            value={filtroEvento}
            onChange={(e) => setFiltroEvento(e.target.value)}
          >
            <option value="todos">Todos los eventos</option>
            {eventosUnicos.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="log-select-arrow" />
        </div>

        <div className="log-select-wrap">
          <select
            value={filtroSeveridad}
            onChange={(e) => setFiltroSeveridad(e.target.value)}
          >
            <option value="todas">Todas las severidades</option>
            <option value="LOW">Baja (LOW)</option>
            <option value="MEDIUM">Media (MEDIUM)</option>
            <option value="HIGH">Alta (HIGH)</option>
            <option value="CRITICAL">Crítica (CRITICAL)</option>
          </select>
          <ChevronDown size={15} className="log-select-arrow" />
        </div>
      </div>

      {loading ? (
        <div className="log-state">
          <div className="log-spinner" />
          <span>Cargando auditoría...</span>
        </div>
      ) : error ? (
        <div className="log-state log-state--error">{error}</div>
      ) : logsFiltrados.length === 0 ? (
        <div className="log-state">
          <Activity size={32} />
          <span>No se encontraron registros</span>
        </div>
      ) : (
        <div className="log-tabla-wrap">
          <table className="log-tabla">
            <thead>
              <tr>
                <th>EVENTO</th>
                <th>USUARIO</th>
                <th>CORREO ELECTRÓNICO</th>
                <th>IP</th>
                <th>SEVERIDAD</th>
                <th>DETALLES</th>
                <th>FECHA / HORA</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.map((log, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="log-ev-name">{log.event}</span>
                  </td>
                  <td>
                    <div className="log-user-info">
                      <User size={13} />
                      {log.user}
                    </div>
                  </td>
                  <td>
                    <div className="log-email-info">
                      <Mail size={13} />
                      {log.email || log.user || "ANONIMO"}
                    </div>
                  </td>
                  <td>
                    <div className="log-ip-info">
                      <Globe size={13} />
                      {log.ip}
                    </div>
                  </td>
                  <td>
                    <span className={`log-sev-badge ${getSeverityClass(log.severity)}`}>
                      {getSeverityIcon(log.severity)}
                      {log.severity}
                    </span>
                  </td>
                  <td>
                    <div className="log-details-cell" title={log.details}>
                      {log.details}
                    </div>
                  </td>
                  <td>
                    <div className="log-time-cell">
                      <span className="log-date">
                        <Calendar size={12} /> {formatFecha(log.timestamp)}
                      </span>
                      <span className="log-time">
                        <Clock size={12} /> {formatHora(log.timestamp)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
