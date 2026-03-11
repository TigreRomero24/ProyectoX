import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const SesionDispositivo = sequelize.define(
  "Sesion_Dispositivo",
  {
    id_sesion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dispositivo_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    refresh_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ultima_actividad: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiracion_refresh: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "sesion_dispositivo",
    timestamps: false, // Manejamos las fechas manualmente según tu análisis
  },
);
