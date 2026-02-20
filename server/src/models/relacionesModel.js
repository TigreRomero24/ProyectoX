import { Usuario } from "./security.models/usuarioModel.js";
import { Dispositivo } from "./security.models/dispositivoModels.js";
import { LogSeguridad } from "./security.models/logSeguridadModels.js";

// ==========================================
// DEFINICIÓN DE RELACIONES (ESTRICTAS SQL)
// ==========================================

// 1. Usuario <-> Dispositivo
Usuario.hasMany(Dispositivo, {
  foreignKey: "id_usuario",
  as: "dispositivo",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Dispositivo.belongsTo(Usuario, {
  foreignKey: "id_usuario",
  as: "usuario",
});

// 2. Usuario <-> LogSeguridad
Usuario.hasMany(LogSeguridad, {
  foreignKey: "id_usuario",
  as: "logs",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

LogSeguridad.belongsTo(Usuario, {
  foreignKey: "id_usuario",
  as: "usuario",
});

export { Usuario, Dispositivo, LogSeguridad };
