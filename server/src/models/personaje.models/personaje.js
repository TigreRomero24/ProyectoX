import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Personaje = sequelize.define(
  "Personaje",
  {
    id_personaje: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    animal: {
      // mascota base del modo de capas PNG: owl | fox | cat | panda | penguin
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "owl",
    },
    genero: {
      type: DataTypes.ENUM("MASCULINO", "FEMENINO"),
      allowNull: false,
      defaultValue: "MASCULINO",
    },
    tono_piel: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: "#f2c9a1",
    },
    color_cabello: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: "#3b2314",
    },
    color_outfit: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: "#2563eb",
    },
    monedas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    nivel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    accesorios_equipados: {
      // { GAFAS: id_item, SOMBRERO: id_item, CAPA: id_item, ... }
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    monedas_hoy_leccion: {
      // contador para el tope diario de monedas ganadas en modo lección
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fecha_monedas_leccion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "personaje",
    timestamps: true,
  },
);
