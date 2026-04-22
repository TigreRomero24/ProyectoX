import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xml2js from "xml2js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📍 Ruta absoluta al archivo XML
const FILE = path.resolve(__dirname, "logs", "security_logs.xml");

// 📌 Leer argumentos desde consola
const args = process.argv.slice(2);

const filtros = {
  event: null,
  user: null,
  ip: null,
};

args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (filtros.hasOwnProperty(key)) {
    filtros[key] = value;
  }
});

// 📌 Función principal
const verLogs = async () => {
  try {
    if (!fs.existsSync(FILE)) {
      console.log("❌ No existe el archivo de logs.");
      return;
    }

    const xmlData = fs.readFileSync(FILE, "utf8");

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);

    let logs = result.securityLogs.log || [];

    // 📌 Normalizar datos
    logs = logs.map((log) => ({
      event: log.event?.[0] || "",
      user: log.user?.[0] || "",
      ip: log.ip?.[0] || "",
      severity: log.severity?.[0] || "",
      timestamp: log.timestamp?.[0] || "",
      details: log.details?.[0] || "",
    }));

    // 📌 Aplicar filtros
    logs = logs.filter((log) => {
      return (
        (!filtros.event || log.event.includes(filtros.event)) &&
        (!filtros.user || log.user.includes(filtros.user)) &&
        (!filtros.ip || log.ip.includes(filtros.ip))
      );
    });

    // 📌 Ordenar por fecha (más reciente primero)
    logs.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // 📌 Mostrar resultados
    console.log("\n🔐 REGISTROS DE SEGURIDAD\n");

    console.table(logs);

    console.log(`\nTotal registros: ${logs.length}\n`);
  } catch (error) {
    console.error("❌ Error leyendo logs:", error.message);
  }
};

// Ejecutar
verLogs();