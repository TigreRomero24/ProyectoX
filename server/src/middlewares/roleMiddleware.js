/**
 * roleMiddleware.js
 * @param {Array} rolesAutorizados - Ejemplo: ['ADMINISTRADOR']
 */
export const roleMiddleware = (rolesAutorizados) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res
        .status(500)
        .json({ ok: false, mensaje: "Se requiere authMiddleware antes" });
    }

    // Verificamos si el rol del usuario está permitido para esta ruta
    if (!rolesAutorizados.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        codigo: "ACCESO_DENEGADO",
        mensaje: "No tienes permisos suficientes para realizar esta acción.",
      });
    }

    next();
  };
};
