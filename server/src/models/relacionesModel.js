import { Usuario } from './usuarioModel.js';
// Usamos el nombre corregido (si hiciste el paso del renombrado)
import { Dispositivo } from './dispositivoModels.js'; 
import { LogSeguridad } from './logSeguridadModels.js'; 

// ==========================================
// DEFINICIÓN DE RELACIONES (ESTRICTAS SQL)
// ==========================================

// 1. Usuario <-> Dispositivo
Usuario.hasMany(Dispositivo, { 
    foreignKey: 'id_usuario', 
    as: 'dispositivos',
    // DB LEVEL: Si borro usuario, PostgreSQL borra dispositivos
    onDelete: 'CASCADE', 
    // DB LEVEL: Si cambio el ID del usuario, PostgreSQL actualiza la FK en dispositivos
    onUpdate: 'CASCADE'
});

Dispositivo.belongsTo(Usuario, { 
    foreignKey: 'id_usuario', 
    as: 'usuario'
});

// 2. Usuario <-> LogSeguridad
Usuario.hasMany(LogSeguridad, { 
    foreignKey: 'id_usuario', 
    as: 'logs',
    onDelete: 'CASCADE', 
    onUpdate: 'CASCADE' // <--- Agregado por tu corrección
});

LogSeguridad.belongsTo(Usuario, { 
    foreignKey: 'id_usuario', 
    as: 'usuario'
});

export { Usuario, Dispositivo, LogSeguridad };