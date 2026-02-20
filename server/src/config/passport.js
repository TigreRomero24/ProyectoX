import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Usuario } from "../models/security.models/usuarioModel.js"; // Importación coherente con tu estructura
import { env } from "./environment.js"; // Importación de tu configuración centralizada

/**
 * CONFIGURACIÓN DE PASSPORT - ESTRATEGIA GOOGLE OAUTH 2.0
 * Utiliza el objeto 'env' para garantizar que las variables existan antes de iniciar.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId, // Extraído de tu environment.js
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Extraer y normalizar el correo del perfil de Google
        const email = profile.emails[0].value.toLowerCase();

        // 2. Validación de dominio institucional (@unemi.edu.ec)
        if (!email.endsWith("@unemi.edu.ec")) {
          return done(null, false, {
            message:
              "Acceso denegado: Se requiere un correo institucional de la UNEMI.",
          });
        }

        // 3. BUSCAR O CREAR USUARIO

        let usuario = await Usuario.findOne({
          where: { correo_institucional: email },
        });

        if (!usuario) {
          usuario = await Usuario.create({
            correo_institucional: email,
            google_id: profile.id,
            metodo_auth: "GOOGLE",
            rol: "ESTUDIANTE",
            activo: true,
          });
        } else {
          if (!usuario.google_id) {
            await usuario.update({
              google_id: profile.id,
              metodo_auth: "HIBRIDO",
            });
          }
        }

        return done(null, usuario);
      } catch (error) {
        console.error("🔴 Error crítico en Passport-Google Strategy:", error);
        return done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => done(null, user.id_usuario));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Usuario.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
