import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Dispositivo = sequelize.define(
  "DispositivoAutorizado",
  {
    id_dispositivo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Sequelize crea automáticamente la FK id_usuario cuando definamos la relación,
    // pero es buena práctica definirla explícitamente para tener control.
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    huella_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      // Este será el código único que genera el frontend
    },
  },
  {
    tableName: "Dispositivo_Autorizado",
    timestamps: false,
  },
);
