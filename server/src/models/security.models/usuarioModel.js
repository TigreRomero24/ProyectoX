import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export const Usuario = sequelize.define(
  "Usuario",
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    correo_institucional: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        isEmailFromUnemi(value) {
          if (!value.endsWith("@unemi.edu.ec")) {
            throw new Error("Solo se permiten correos @unemi.edu.ec");
          }
        },
      },
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    rol: {
      type: DataTypes.ENUM("ESTUDIANTE", "ADMINISTRADOR"),
      defaultValue: "ESTUDIANTE",
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    limite_dispositivos: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
  },
  {
    tableName: "usuario",
    timestamps: false,
    hooks: {
      beforeSave: (usuario) => {
        if (usuario.correo_institucional) {
          usuario.correo_institucional =
            usuario.correo_institucional.toLowerCase();
        }
      },
    },
  },
);
