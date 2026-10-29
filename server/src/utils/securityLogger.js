import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta absoluta: server/src/utils -> server -> logs
const LOGS_DIR = path.resolve(__dirname, "..", "..", "logs");
const FILE = path.join(LOGS_DIR, "security_logs.xml");

// Asegurar que el directorio de logs existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Inicializar XML si no existe
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "<securityLogs>\n</securityLogs>");
}

// Escapa texto para meterlo en el XML; recorta para que nadie infle el archivo.
export const xmlSeguro = (valor, max = 300) =>
  String(valor ?? "")
    .slice(0, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const logSecurityEvent = ({
  event,
  user = "ANONIMO",
  ip = "UNKNOWN",
  severity = "LOW",
  details = "",
}) => {
  const logEntry = `
  <log>
    <event>${xmlSeguro(event)}</event>
    <user>${xmlSeguro(user)}</user>
    <ip>${xmlSeguro(ip)}</ip>
    <severity>${xmlSeguro(severity)}</severity>
    <details>${xmlSeguro(details)}</details>
    <timestamp>${new Date().toISOString()}</timestamp>
  </log>`;

  let xml = fs.readFileSync(FILE, "utf8");
  xml = xml.replace("</securityLogs>", `${logEntry}\n</securityLogs>`);
  fs.writeFileSync(FILE, xml);
};