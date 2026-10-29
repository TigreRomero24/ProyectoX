import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const UsuarioItem = sequelize.define(
  "Usuario_Item",
  {
    id_usuario_item: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_item: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "usuario_item",
    timestamps: true,
    indexes: [{ unique: true, fields: ["id_usuario", "id_item"] }],
  },
);
