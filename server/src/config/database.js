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
    logging: env.isDevelopment ? console.log : false,

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
