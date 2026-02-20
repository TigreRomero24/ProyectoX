import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Question = sequelize.define(
  "Question",
  {
    id_pregunta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_materia: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    enunciado: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    url_imagen: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "Banco_Pregunta",
    timestamps: true,
  },
);
