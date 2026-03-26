import { Sequelize } from "sequelize";
import { env } from "./environment.js";
export const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.password,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: "postgres",
    logging: env.db.sqlLogging ? console.log : false,

    pool: {
      max: 5,
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

export const dbConnect = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Base de Datos: Conexión establecida (Sequelize).");

    await sequelize.sync({ force: false, alter: env.isDevelopment });
    console.log("✅ Base de Datos: Tablas sincronizadas correctamente.");

    await armonizarConstraintsInscripcion();
    await asegurarIndiceUnicoIntentoEnProgreso();

    try {
      await sequelize.query(
        `DROP INDEX IF EXISTS "sesion_dispositivo_dispositivo_id_key"`,
      );
      console.log(
        "✅ Índice único eliminado: sesion_dispositivo_dispositivo_id_key",
      );
    } catch (idxError) {
      console.log("ℹ️ Índice no existía o ya eliminado");
    }
  } catch (error) {
    console.error("❌ FATAL: Error al conectar con la Base de Datos:");
    console.error(`   Detalle: ${error.message}`);
    process.exit(1);
  }
};

const armonizarConstraintsInscripcion = async () => {
  const q = sequelize.getQueryInterface();

  const [constraints] = await sequelize.query(`
    SELECT c.conname AS name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'u'
      AND n.nspname = 'public'
      AND t.relname = 'inscripcion'
      AND pg_get_constraintdef(c.oid) = 'UNIQUE (id_usuario, id_materia)'
  `);

  for (const { name } of constraints) {
    await q.removeConstraint("inscripcion", name);
    console.log(
      `✅ Constraint único removido en inscripcion (id_usuario,id_materia): ${name}`,
    );
  }

  const [indexes] = await sequelize.query(`
    SELECT i.relname AS name
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index x ON x.indrelid = t.oid
    JOIN pg_class i ON i.oid = x.indexrelid
    WHERE n.nspname = 'public'
      AND t.relname = 'inscripcion'
      AND x.indisunique = true
      AND x.indisprimary = false
      AND x.indpred IS NULL
      AND x.indnatts = 2
      AND x.indkey::text = (
        SELECT string_agg(a.attnum::text, ' ' ORDER BY k.ord)
        FROM unnest(ARRAY[
          (SELECT attnum FROM pg_attribute WHERE attrelid = t.oid AND attname = 'id_usuario' AND NOT attisdropped),
          (SELECT attnum FROM pg_attribute WHERE attrelid = t.oid AND attname = 'id_materia' AND NOT attisdropped)
        ]) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conindid = x.indexrelid
      )
  `);

  for (const { name } of indexes) {
    await q.removeIndex("inscripcion", name);
    console.log(
      `✅ Índice único removido en inscripcion (id_usuario,id_materia): ${name}`,
    );
  }
};

const asegurarIndiceUnicoIntentoEnProgreso = async () => {
  try {
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_intento_en_progreso_usuario_config
      ON intento (id_usuario, id_config)
      WHERE estado = 'EN_PROGRESO'
    `);
    console.log(
      "✅ Índice único parcial asegurado: uq_intento_en_progreso_usuario_config",
    );
  } catch (error) {
    if (error?.original?.code === "23505") {
      console.warn(
        "⚠️ No se pudo crear uq_intento_en_progreso_usuario_config por datos duplicados existentes. Continúa sin índice único hasta corregir esos registros.",
      );
      return;
    }
    throw error;
  }
};
