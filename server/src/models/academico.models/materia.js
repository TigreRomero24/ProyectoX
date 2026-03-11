import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Materia = sequelize.define(
  "Materia",
  {
    id_materia: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        msg: "Esta materia ya se encuentra registrada",
      },
      validate: {
        notEmpty: {
          msg: "El nombre de la materia es obligatorio",
        },
      },
    },
  },
  {
    tableName: "Materia",
    timestamps: true,
    hooks: {
      beforeSave: (materia) => {
        if (materia.nombre) {
          materia.nombre = materia.nombre.trim();
        }
      },
    },
  },
);
