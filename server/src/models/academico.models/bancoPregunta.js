import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const BancoPregunta = sequelize.define(
  "Banco_Pregunta",
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
      validate: {
        notEmpty: true,
      },
    },
    url_imagen: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tipo_pregunta: {
      type: DataTypes.ENUM("MULTIPLE", "VERDADERO_FALSO"),
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "banco_pregunta",
    timestamps: true,
    indexes: [
      {
        name: "idx_pregunta_materia",
        fields: ["id_materia"],
      },
    ],
  },
);
