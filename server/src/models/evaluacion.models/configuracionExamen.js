import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const ConfiguracionExamen = sequelize.define(
  "Configuracion_Examen",
  {
    id_config: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_materia: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    modo: {
      type: DataTypes.ENUM("TEST", "EXAMEN"),
      allowNull: false,
    },
    tiempo_limite_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    intentos_permitidos: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    tableName: "configuracion_examen",
    timestamps: false,
  },
);
