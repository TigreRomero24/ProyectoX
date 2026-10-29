import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const DueloRespuesta = sequelize.define(
  "Duelo_Respuesta",
  {
    id_duelo_respuesta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_duelo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_pregunta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_opcion_elegida: {
      type: DataTypes.INTEGER,
      allowNull: true, // null si no respondió a tiempo
    },
    es_correcta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    tiempo_respuesta_ms: {
      // tiempo transcurrido desde que se mostró la pregunta hasta que respondió
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    puntos_obtenidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "duelo_respuesta",
    timestamps: true,
    indexes: [
      { name: "idx_duelo_respuesta_duelo", fields: ["id_duelo"] },
      {
        unique: true,
        fields: ["id_duelo", "id_usuario", "id_pregunta"],
        name: "uq_duelo_respuesta_usuario_pregunta",
      },
    ],
  },
);
