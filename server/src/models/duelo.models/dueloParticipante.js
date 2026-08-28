import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const DueloParticipante = sequelize.define(
  "Duelo_Participante",
  {
    id_participante: {
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
    puntaje: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    respuestas_correctas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    conectado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    listo: {
      // true cuando confirma "listo" en la sala de espera
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "duelo_participante",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["id_duelo", "id_usuario"] },
      { name: "idx_participante_duelo", fields: ["id_duelo"] },
    ],
  },
);
