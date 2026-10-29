import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const ItemTienda = sequelize.define(
  "Item_Tienda",
  {
    id_item: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    tipo: {
      // cada tipo es una "capa" del SVG del personaje; solo puede haber
      // un item equipado por tipo a la vez
      type: DataTypes.ENUM(
        "GAFAS",
        "SOMBRERO",
        "CAPA",
        "MOCHILA",
        "MARCO",
        "CABEZA",
        "OJOS",
        "ESPALDA",
        "MANO",
        "CUERPO",
      ),
      allowNull: false,
    },
    imagen: {
      // nombre del PNG en client/public/personajes/ (null = solo se ve en el modo SVG)
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    color: {
      // color hexadecimal que se aplica a la pieza SVG del accesorio
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    costo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rareza: {
      type: DataTypes.ENUM("COMUN", "RARO", "EPICO"),
      allowNull: false,
      defaultValue: "COMUN",
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "item_tienda",
    timestamps: true,
  },
);
