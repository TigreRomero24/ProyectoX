import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const DetalleIntento = sequelize.define(
  "Detalle_Intento",
  {
    id_detalle: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_intento: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_pregunta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_opcion_elegida: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    es_correcta_snapshot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    puntos_obtenidos: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
  },
  {
    tableName: "detalle_intento",
    timestamps: false,
  },
);
