import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseStringPromise } from "xml2js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";
import { RoleMiddleware } from "../middlewares/roleMiddleware.js";
import { Usuario } from "../models/security.models/usuarioModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const LOGS_DIR = path.resolve(__dirname, "..", "..", "logs");
const FILE = path.join(LOGS_DIR, "security_logs.xml");

// Inicialización segura del archivo de logs
const initLogFile = () => {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, "<securityLogs>\n</securityLogs>");
    }
    console.info("✅ Auditoría: Archivo de logs listo.");
  } catch (error) {
    console.error("❌ Auditoría: Error al inicializar el archivo de logs:", error.message);
    console.warn("⚠️  Los eventos de seguridad no se guardarán en el archivo XML.");
  }
};

initLogFile();

const soloAdmin = [
  AuthMiddleware.handle,
  SessionMiddleware.handle,
  RoleMiddleware.require(["ADMINISTRADOR"]),
];

router.get("/security-logs", soloAdmin, async (req, res) => {
  try {
    const xml = fs.readFileSync(FILE, "utf8");
    const result = await parseStringPromise(xml);
    const logs = result.securityLogs.log || [];

    // Obtener todos los usuarios para mapear IDs a correos
    const usuarios = await Usuario.findAll({
      attributes: ["id_usuario", "correo_institucional"]
    });
    
    const userMap = {};
    usuarios.forEach((u) => {
      userMap[u.id_usuario] = u.correo_institucional;
    });

    // Formatear logs para el frontend
    const formattedLogs = logs.map((l) => {
      const userVal = l.user ? l.user[0] : "ANONIMO";
      // Si userVal es un número (ID de usuario), buscar el correo, de lo contrario usar userVal
      let email = userVal;
      if (/^\d+$/.test(userVal) && userMap[userVal]) {
        email = userMap[userVal];
      }

      return {
        event: l.event ? l.event[0] : "UNKNOWN",
        user: userVal,
        email: email,
        ip: l.ip ? l.ip[0] : "UNKNOWN",
        severity: l.severity ? l.severity[0] : "LOW",
        details: l.details ? l.details[0] : "",
        timestamp: l.timestamp ? l.timestamp[0] : new Date().toISOString(),
      };
    });

    // Ordenar por fecha descendente
    formattedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ ok: true, data: formattedLogs });
  } catch (error) {
    console.error("Error leyendo logs:", error);
    res.status(500).json({ ok: false, error: "Error al leer los logs de seguridad" });
  }
});

router.post("/security-log", async (req, res) => {
  const { event, timestamp, user, url, userAgent, severity, errorCode, ipPublic } = req.body;

  const ip =
    ipPublic ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  let geoData = {};

  try {
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    geoData = await geoRes.json();
  } catch (error) {
    console.error("Error obteniendo geolocalización:", error);
  }

  const detailsParts = [];

  if (url) detailsParts.push(`url=${url}`);
  if (userAgent) detailsParts.push(`ua=${userAgent}`);
  if (errorCode) detailsParts.push(`code=${errorCode}`);

  if (geoData.city) detailsParts.push(`city=${geoData.city}`);
  if (geoData.country_name) detailsParts.push(`country=${geoData.country_name}`);
  if (geoData.org) detailsParts.push(`isp=${geoData.org}`);

  const details = detailsParts.join(" | ");

  const logEntry = `
  <log>
    <event>${event}</event>
    <user>${user}</user>
    <ip>${ip}</ip>
    <severity>${severity || "LOW"}</severity>
    <details>${details}</details>
    <timestamp>${timestamp}</timestamp>
  </log>`;

  try {
    let xml = fs.readFileSync(FILE, "utf8");
    xml = xml.replace("</securityLogs>", `${logEntry}\n</securityLogs>`);
    fs.writeFileSync(FILE, xml);
  } catch (error) {
    console.error("❌ Auditoría: No se pudo escribir en el archivo de logs:", error.message);
    // No devolvemos error al cliente para no interrumpir el flujo de la app
  }

  res.json({ ok: true });
});

export default router;