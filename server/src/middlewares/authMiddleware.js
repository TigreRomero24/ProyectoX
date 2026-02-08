import { TokenFactory } from '../utils/tokenFactory.js';

export const authMiddleware = (req, res, next) => {
    try {
        // 1. Obtener la cabecera Authorization
        const authHeader = req.headers.authorization;

        // 2. Validación Estricta: ¿Existe y empieza con "Bearer "?
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                ok: false, 
                mensaje: "Acceso denegado. Formato de token inválido (se espera 'Bearer <token>')." 
            });
        }

        // 3. Extracción limpia del token
        const token = authHeader.split(" ")[1];

        // 4. Instancia y Verificación (Usando tu Factory)
        const tokenHandler = TokenFactory.createToken("JWT");
        const decoded = tokenHandler.verify(token);

        // 5. Manejo de Errores de Token
        if (!decoded) { 
            // Usamos 401 (Unauthorized) porque el token no es válido o expiró.
            // 403 (Forbidden) se usa cuando el token ES válido, pero el usuario no tiene permisos (rol).
            return res.status(401).json({ 
                ok: false, 
                mensaje: "Sesión inválida o expirada. Por favor, inicie sesión nuevamente." 
            });
        }

        // 6. Inyección de contexto (Context Injection)
        // Guardamos los datos del usuario en la request para que el Controlador los use.
        req.usuario = decoded; 
        
        next();

    } catch (error) {
        console.error("Middleware Auth Error:", error);
        return res.status(500).json({ 
            ok: false, 
            mensaje: "Error interno al procesar la autenticación." 
        });
    }
};