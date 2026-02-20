import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Subject = sequelize.define(
  "Subject",
  {
    id_materia: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "Materia",
    timestamps: false,
  },
);
