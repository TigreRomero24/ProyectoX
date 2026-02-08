import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    correo_institucional: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    rol: {
        type: DataTypes.STRING(50),
        defaultValue: 'ESTUDIANTE' // O 'ADMIN'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    token_sesion_actual: {
        type: DataTypes.STRING,
        allowNull: true
    },
    token_expiracion: {  // Corregido: en el modelo dice "token_expiración"
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'Usuario',  // Cambiado: el modelo dice "Usuario" no "usuarios"
    timestamps: false
});