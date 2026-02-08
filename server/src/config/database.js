import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Solo una instancia: Sequelize maneja todo (conexión, pool, modelos)
export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT,
        logging: false, // Pon en true si quieres ver las consultas SQL en la terminal
        dialectOptions: {
            // Opcional: necesario si usas SSL en producción (ej. Render/Heroku)
            // ssl: { require: true, rejectUnauthorized: false }
        }
    }
);

// Función para iniciar la base de datos
export const dbConnect = async () => {
    try {
        // 1. Verificar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL exitosa (vía Sequelize).');

        // 2. Sincronizar modelos (Crear tablas si no existen)
        await sequelize.sync({ force: false, alter: true });
        console.log('✅ Tablas sincronizadas.');

    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
    }
};