import { Usuario } from "./security.models/usuarioModel.js";
import { SesionDispositivo } from "./security.models/sessionModel.js";
import { Materia } from "./academico.models/materia.js";
import { Inscripcion } from "./academico.models/inscripcion.js";
import { BancoPregunta } from "./academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "./academico.models/opcionRespuesta.js";
import { ConfiguracionExamen } from "./evaluacion.models/configuracionExamen.js";
import { Intento } from "./evaluacion.models/intento.js";
import { DetalleIntento } from "./evaluacion.models/detalleIntento.js";

Usuario.hasMany(SesionDispositivo, {
  foreignKey: "id_usuario",
  as: "sesiones",
});
SesionDispositivo.belongsTo(Usuario, {
  foreignKey: "id_usuario",
  as: "propietario",
});

Usuario.belongsToMany(Materia, {
  through: Inscripcion,
  foreignKey: "id_usuario",
  otherKey: "id_materia",
  as: "materias_inscritas",
});
Materia.belongsToMany(Usuario, {
  through: Inscripcion,
  foreignKey: "id_materia",
  otherKey: "id_usuario",
  as: "estudiantes_inscritos",
});

Usuario.hasMany(Inscripcion, { foreignKey: "id_usuario", as: "inscripciones" });
Inscripcion.belongsTo(Usuario, { foreignKey: "id_usuario" });

Materia.hasMany(Inscripcion, {
  foreignKey: "id_materia",
  as: "inscripciones_materia",
});
Inscripcion.belongsTo(Materia, { foreignKey: "id_materia" });

Materia.hasMany(BancoPregunta, {
  foreignKey: "id_materia",
  as: "preguntas",
});
BancoPregunta.belongsTo(Materia, { foreignKey: "id_materia" });

BancoPregunta.hasMany(OpcionRespuesta, {
  foreignKey: "id_pregunta",
  as: "opciones",
});
OpcionRespuesta.belongsTo(BancoPregunta, { foreignKey: "id_pregunta" });

Materia.hasMany(ConfiguracionExamen, {
  foreignKey: "id_materia",
  as: "configuraciones",
});
ConfiguracionExamen.belongsTo(Materia, { foreignKey: "id_materia" });

Usuario.hasMany(Intento, { foreignKey: "id_usuario", as: "intentos" });
Intento.belongsTo(Usuario, { foreignKey: "id_usuario" });

ConfiguracionExamen.hasMany(Intento, {
  foreignKey: "id_config",
  as: "intentos_realizados",
});
Intento.belongsTo(ConfiguracionExamen, {
  foreignKey: "id_config",
  as: "configuracion",
});

Intento.hasMany(DetalleIntento, {
  foreignKey: "id_intento",
  as: "respuestas_detalle",
});
DetalleIntento.belongsTo(Intento, { foreignKey: "id_intento" });

BancoPregunta.hasMany(DetalleIntento, { foreignKey: "id_pregunta" });
DetalleIntento.belongsTo(BancoPregunta, { foreignKey: "id_pregunta" });

OpcionRespuesta.hasMany(DetalleIntento, {
  foreignKey: "id_opcion_elegida",
});
DetalleIntento.belongsTo(OpcionRespuesta, {
  foreignKey: "id_opcion_elegida",
  as: "opcion_marcada",
});
