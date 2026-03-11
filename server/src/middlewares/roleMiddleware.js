export class RoleMiddleware {
  /**
   * @param {string[]} allowedRoles -
   */
  static require(allowedRoles) {
    return (req, res, next) => {
      try {
        const userRole = req.user?.rol;
        if (!userRole) {
          return res.status(403).json({
            error: "No se pudo determinar su nivel de acceso.",
          });
        }

        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({
            error:
              "No tiene los privilegios necesarios para realizar esta acción.",
          });
        }

        next();
      } catch (error) {
        console.error("[RoleMiddleware Error]:", error);
        return res
          .status(500)
          .json({ error: "Error al validar los permisos." });
      }
    };
  }
}
