import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Duelo = sequelize.define(
  "Duelo",
  {
    id_duelo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      // código corto para unirse a la sala (ej: "K3F9A1")
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    id_materia: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_creador: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cantidad_preguntas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: { min: 1, max: 50 },
    },
    tiempo_por_pregunta_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20000,
    },
    max_participantes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: { min: 2, max: 10 },
    },
    estado: {
      type: DataTypes.ENUM("ESPERANDO", "EN_CURSO", "FINALIZADO", "CANCELADO"),
      allowNull: false,
      defaultValue: "ESPERANDO",
    },
    pregunta_actual: {
      // índice (0-based) de la pregunta activa dentro de preguntas_ids
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    preguntas_ids: {
      // snapshot de id_pregunta (BancoPregunta) en el orden que se jugarán
      type: DataTypes.JSONB,
      allowNull: true,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "duelo",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["codigo"] },
      { name: "idx_duelo_materia", fields: ["id_materia"] },
    ],
  },
);
