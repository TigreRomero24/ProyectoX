import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const OpcionRespuesta = sequelize.define(
  "Opcion_Respuesta",
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
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    es_correcta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "opcion_respuesta",
    timestamps: true,
    indexes: [
      {
        name: "idx_opcion_pregunta",
        fields: ["id_pregunta"],
      },
    ],
  },
);
