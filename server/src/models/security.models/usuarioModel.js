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
        // Solo dominio institucional
        isEmailFromUnemi(value) {
          if (!value.endsWith("@unemi.edu.ec")) {
            throw new Error("Solo se permiten correos @unemi.edu.ec");
          }
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    google_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    rol: {
      type: DataTypes.ENUM("ESTUDIANTE", "ADMINISTRADOR", "CONTADOR"),
      defaultValue: "ESTUDIANTE",
      allowNull: false,
    },
    metodo_auth: {
      type: DataTypes.ENUM("LOCAL", "GOOGLE", "HIBRIDO"),
      defaultValue: "LOCAL",
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    token_sesion_actual: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    token_expiracion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "Usuario",
    timestamps: true,
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
