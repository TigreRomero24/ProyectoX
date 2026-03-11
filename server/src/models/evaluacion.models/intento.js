import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Intento = sequelize.define(
  "Intento",
  {
    id_intento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_config: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM("EN_PROGRESO", "FINALIZADO"),
      defaultValue: "EN_PROGRESO",
      allowNull: false,
    },
    nota_final: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
  },
  {
    tableName: "intento",
    timestamps: false,
  },
);
