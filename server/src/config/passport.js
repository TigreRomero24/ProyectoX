import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./environment.js";

/**
 * ====================================================================
 * CONFIGURACIÓN DE PASSPORT - GOOGLE OAUTH 2.0
 * ====================================================================
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,

      proxy: true,
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile || !profile.emails || profile.emails.length === 0) {
          return done(
            new Error(
              "VALIDACION: El perfil de Google no retornó un correo electrónico válido.",
            ),
            null,
          );
        }

        return done(null, profile);
      } catch (error) {
        console.error("🔴 [Passport-Google Error]:", error.message);
        return done(error, null);
      }
    },
  ),
);

export default passport;
