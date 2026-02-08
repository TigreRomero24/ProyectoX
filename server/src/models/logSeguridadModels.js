import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LogSeguridad = sequelize.define('LogSeguridad', {
    id_log: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ip_origen: {
        type: DataTypes.STRING,
        allowNull: true
    },
    accion: {
        type: DataTypes.STRING, // Ej: "LOGIN", "INTENTO_FALLIDO", "LOGOUT"
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW // Se guarda la fecha actual automáticamente
    }
}, {
    tableName: 'Log_Seguridad',
    timestamps: false
});