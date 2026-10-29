import { Sequelize } from "sequelize";
import { env } from "./environment.js"; // Única fuente de verdad

export const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.password,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: "postgres",
    // Para depurar consultas: DB_LOGGING=true en el .env
    logging: process.env.DB_LOGGING === "true" ? console.log : false,

    pool: {
      // Postgres admite 100 conexiones por defecto; 5 dejaba peticiones en cola.
      max: parseInt(process.env.DB_POOL_MAX, 10) || 15,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },

    define: {
      timestamps: true,
      underscored: true,
    },
  },
);

// Versiones anteriores de los modelos (unique: true + sync alter) agregaban
// una restricción UNIQUE repetida en cada arranque (usuario_correo_institucional_key1,
// _key2, ...). Esto deja una sola por columna, con su nombre base. Idempotente:
// si no hay duplicados no hace nada.
const LIMPIAR_UNIQUE_DUPLICADOS = `
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tabla, c.conname,
           regexp_replace(c.conname, '_key[0-9]+$', '_key') AS base,
           row_number() OVER (
             PARTITION BY c.conrelid, c.conkey
             ORDER BY (c.conname ~ '_key$') DESC, c.oid
           ) AS n
    FROM pg_constraint c
    WHERE c.connamespace = 'public'::regnamespace
      AND c.contype = 'u'
      AND c.conname ~ '_key[0-9]*$'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint f WHERE f.contype = 'f' AND f.conindid = c.conindid)
  LOOP
    IF r.n > 1 THEN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tabla, r.conname);
    ELSIF r.conname <> r.base THEN
      EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', r.tabla, r.conname, r.base);
    END IF;
  END LOOP;
END $$;`;

export const dbConnect = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Base de Datos: Conexión establecida (Sequelize).");

    await sequelize.query(LIMPIAR_UNIQUE_DUPLICADOS);
    await sequelize.sync({ force: false, alter: true });
    console.log("✅ Base de Datos: Tablas sincronizadas correctamente.");
  } catch (error) {
    console.error("❌ FATAL: Error al conectar con la Base de Datos:");
    console.error(`   Detalle: ${error.message}`);
    process.exit(1);
  }
};
