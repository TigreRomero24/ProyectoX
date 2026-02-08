import { Router } from "express";
import bcrypt from "bcrypt"; // 📦 Necesario: npm install bcrypt
import { Usuario, Dispositivo, LogSeguridad } from "../models/relacionesModel.js";
import { TokenFactory } from "../utils/tokenFactory.js";

const router = Router();

// ==========================================
// 1. REGISTRO 
// ==========================================
router.post("/usuarios", async (req, res) => {
    try {
        const { correo_institucional, password, rol } = req.body;

        if (!correo_institucional || !password) {
            return res.status(400).json({ ok: false, mensaje: "Faltan datos obligatorios." });
        }

        // 🔒 SEGURIDAD: Encriptar contraseña antes de guardar
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = await Usuario.create({
            correo_institucional,
            password: hashedPassword, 
            rol: rol || 'ESTUDIANTE',
            activo: true
        });

        // 🧹 LIMPIEZA: No devolver la contraseña en la respuesta
        const usuarioResponse = nuevoUsuario.toJSON();
        delete usuarioResponse.password;

        return res.status(201).json({
            ok: true,
            mensaje: "Usuario creado exitosamente",
            usuario: usuarioResponse
        });

    } catch (error) {
        console.error("Error en registro:", error);
        // Manejo de errores de Sequelize simplificado
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ ok: false, mensaje: "El correo ya está registrado." }); // 409 Conflict
        }
        return res.status(500).json({ ok: false, mensaje: "Error interno." });
    }
});

// ==========================================
// 2. LISTAR (Con Proyección de Datos)
// ==========================================
// GET: Listar Usuarios
router.get("/usuarios", async (req, res) => {
    try {
        const listaUsuarios = await Usuario.findAll({
            // CORREGIDO: Usamos los nombres reales de TU modelo
            attributes: [
                'id_usuario',          // Antes decía 'id'
                'correo_institucional', 
                'rol', 
                'activo'
                // 'createdAt' <-- SOLO descomenta esto si pusiste timestamps: true
            ]
        });

        return res.status(200).json({ ok: true, data: listaUsuarios });
    } catch (error) {
        console.error("Error SQL:", error); // Esto te mostrará el error real en la consola
        return res.status(500).json({ ok: false, mensaje: "Error al leer usuarios" });
    }
});
// ==========================================
// 3. ELIMINAR 
// ==========================================
router.delete("/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const filas = await Usuario.destroy({ where: { id_usuario: id } });

        if (!filas) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });

        return res.status(200).json({ ok: true, mensaje: "Usuario eliminado" });
    } catch (error) {
        return res.status(500).json({ ok: false, mensaje: "Error al eliminar" });
    }
});

// ==========================================
// 4. LOGIN (Lógica Crítica y Auditoría)
// ==========================================
router.post("/login", async (req, res) => {
    try {
        const { correo_institucional, password, huella_dispositivo } = req.body;
        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // IP real tras proxy

        if (!correo_institucional || !password || !huella_dispositivo) {
            return res.status(400).json({ ok: false, mensaje: "Credenciales y huella requeridas." });
        }

        // 1. Búsqueda de Usuario
        const usuario = await Usuario.findOne({ where: { correo_institucional, activo: true } });
        
        // 2. Verificación de Password (con bcrypt)
        // Usamos una variable genérica para evitar Timing Attacks (si el usuario no existe)
        const validPassword = usuario ? await bcrypt.compare(password, usuario.password) : false;

        if (!usuario || !validPassword) {
            if (usuario) {
                // Auditoría solo si el usuario existe para evitar llenar la BD de basura
                await LogSeguridad.create({ id_usuario: usuario.id_usuario, ip_origen: userIp, accion: 'LOGIN_FALLIDO' });
            }
            return res.status(401).json({ ok: false, mensaje: "Credenciales inválidas" });
        }

        // 3. Control de Dispositivo (Device Locking)
        let dispositivo = await Dispositivo.findOne({ where: { id_usuario: usuario.id_usuario } });

        if (dispositivo) {
            // Si el hash no coincide, es un intento de robo de cuenta o cambio de PC no autorizado
            if (dispositivo.huella_hash !== huella_dispositivo) {
                await LogSeguridad.create({ 
                    id_usuario: usuario.id_usuario, 
                    ip_origen: userIp, 
                    accion: 'BLOQUEO_DISPOSITIVO_NO_AUTORIZADO' 
                });
                return res.status(403).json({ 
                    ok: false, 
                    mensaje: "Dispositivo no reconocido. Acceso denegado por política de seguridad." 
                });
            }
        } else {
            // Primer login exitoso: Vinculamos este dispositivo al usuario
            await Dispositivo.create({ id_usuario: usuario.id_usuario, huella_hash: huella_dispositivo });
        }

        // 4. Generación de Sesión
        const token = TokenFactory.createToken("JWT").generate({
            id: usuario.id_usuario,
            rol: usuario.rol,
            correo: usuario.correo_institucional
        });

        // Actualizamos estado del usuario
        await usuario.update({ 
            token_sesion_actual: token,
            token_expiracion: new Date(Date.now() + 8 * 60 * 60 * 1000)
        });

        await LogSeguridad.create({ id_usuario: usuario.id_usuario, ip_origen: userIp, accion: 'LOGIN_EXITOSO' });

        return res.status(200).json({
            ok: true,
            token,
            usuario: { correo: usuario.correo_institucional, rol: usuario.rol }
        });

    } catch (error) {
        console.error("Critical Login Error:", error);
        return res.status(500).json({ ok: false, mensaje: "Error en el servicio de autenticación" });
    }
});

export default router;