import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const LOGS_DIR = path.resolve(__dirname, "..", "..", "logs");
const FILE = path.join(LOGS_DIR, "security_logs.xml");

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "<securityLogs>\n</securityLogs>");
}

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

  let xml = fs.readFileSync(FILE, "utf8");
  xml = xml.replace("</securityLogs>", `${logEntry}\n</securityLogs>`);
  fs.writeFileSync(FILE, xml);

  res.json({ ok: true });
});

export default router;