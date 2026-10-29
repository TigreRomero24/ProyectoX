import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Intento = sequelize.define(
  "Intento",
  {
    id_intento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_config: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM("EN_PROGRESO", "FINALIZADO", "ANULADO"),
      defaultValue: "EN_PROGRESO",
      allowNull: false,
    },
    nota_final: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    total_preguntas: {
      type: DataTypes.INTEGER,
      allowNull: true, // null en intentos legacy ya existentes
    },
    preguntas_ids: {
      type: DataTypes.JSONB,
      allowNull: true, // array de id_pregunta en el orden sorteado
    },
  },
  {
    tableName: "intento",
    timestamps: false,
    indexes: [
      // historial del estudiante (id_usuario + estado)
      { name: "idx_intento_usuario_estado", fields: ["id_usuario", "estado"] },
      // conteo de intentos por examen al iniciar / resetear
      { name: "idx_intento_config_usuario", fields: ["id_config", "id_usuario"] },
    ],
  },
);