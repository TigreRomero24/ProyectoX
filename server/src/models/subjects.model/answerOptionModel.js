import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const AnswerOption = sequelize.define(
  "AnswerOption",
  {
    id_opcion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_pregunta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    texto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    es_correcta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "Opcion_Respuesta",
    timestamps: false,
  },
);
