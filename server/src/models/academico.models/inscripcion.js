import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Inscripcion = sequelize.define(
  "Inscripcion",
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    id_materia: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    modo_evaluacion: {
      type: DataTypes.ENUM("TEST", "EXAMEN"),
      primaryKey: true,
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    fecha_inscripcion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "inscripcion",
    timestamps: false,
  },
);
