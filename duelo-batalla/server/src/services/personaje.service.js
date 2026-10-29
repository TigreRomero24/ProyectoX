import { Personaje } from "../models/personaje.models/personaje.js";
import { ItemTienda } from "../models/personaje.models/itemTienda.js";
import { UsuarioItem } from "../models/personaje.models/usuarioItem.js";

const XP_POR_NIVEL = 100;
const LIMITE_MONEDAS_LECCION_DIA = 30;
const MONEDAS_POR_ACIERTO_LECCION = 2;

const GENEROS_VALIDOS = new Set(["MASCULINO", "FEMENINO"]);
const ANIMALES_VALIDOS = new Set(["owl", "fox", "cat", "panda", "penguin"]);
const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;

export class PersonajeService {
  static #calcularNivel(xp) {
    return Math.floor(xp / XP_POR_NIVEL) + 1;
  }

  static async obtenerOCrearPersonaje(id_usuario) {
    const [personaje] = await Personaje.findOrCreate({
      where: { id_usuario },
      defaults: { id_usuario },
    });
    return personaje;
  }

  static async obtenerPerfil(id_usuario) {
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    const inventario = await UsuarioItem.findAll({
      where: { id_usuario },
      include: [{ model: ItemTienda, as: "item" }],
    });

    return {
      ...personaje.get({ plain: true }),
      xp_para_siguiente_nivel: personaje.nivel * XP_POR_NIVEL,
      inventario: inventario.map((ui) => ui.item),
    };
  }

  static async actualizarApariencia(id_usuario, { animal, genero, tono_piel, color_cabello, color_outfit }) {
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);

    if (animal !== undefined) {
      if (!ANIMALES_VALIDOS.has(animal)) {
        throw new Error("VALIDACION: Animal inválido.");
      }
      personaje.animal = animal;
    }

    if (genero !== undefined) {
      if (!GENEROS_VALIDOS.has(genero)) {
        throw new Error("VALIDACION: Género inválido.");
      }
      personaje.genero = genero;
    }
    for (const [campo, valor] of Object.entries({
      tono_piel,
      color_cabello,
      color_outfit,
    })) {
      if (valor === undefined) continue;
      if (!HEX_VALIDO.test(valor)) {
        throw new Error(`VALIDACION: ${campo} debe ser un color hexadecimal válido (#rrggbb).`);
      }
      personaje[campo] = valor;
    }

    await personaje.save();
    return personaje;
  }

  /** Otorga monedas + xp por igual (examen, duelo). Sin tope diario. */
  static async otorgarMonedas(id_usuario, cantidad) {
    if (cantidad <= 0) return;
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    personaje.monedas += cantidad;
    personaje.xp += cantidad;
    personaje.nivel = PersonajeService.#calcularNivel(personaje.xp);
    await personaje.save();
  }

  /**
   * Otorga monedas por aciertos en modo lección, con tope diario para
   * evitar que se farmee infinito repitiendo el mismo test sin límite.
   */
  static async otorgarMonedasLeccion(id_usuario, aciertos) {
    if (aciertos <= 0) return 0;
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);

    const hoy = new Date().toISOString().slice(0, 10);
    if (personaje.fecha_monedas_leccion !== hoy) {
      personaje.fecha_monedas_leccion = hoy;
      personaje.monedas_hoy_leccion = 0;
    }

    const disponible = LIMITE_MONEDAS_LECCION_DIA - personaje.monedas_hoy_leccion;
    const aOtorgar = Math.max(0, Math.min(aciertos * MONEDAS_POR_ACIERTO_LECCION, disponible));

    if (aOtorgar > 0) {
      personaje.monedas += aOtorgar;
      personaje.xp += aOtorgar;
      personaje.nivel = PersonajeService.#calcularNivel(personaje.xp);
      personaje.monedas_hoy_leccion += aOtorgar;
    }
    await personaje.save();
    return aOtorgar;
  }

  static async obtenerTienda() {
    return ItemTienda.findAll({
      where: { activo: true },
      order: [["costo", "ASC"]],
    });
  }

  static async comprarItem(id_usuario, id_item) {
    const item = await ItemTienda.findOne({ where: { id_item, activo: true } });
    if (!item) {
      throw new Error("NO_ENCONTRADO: El item no existe o ya no está disponible.");
    }

    const yaLoTiene = await UsuarioItem.findOne({ where: { id_usuario, id_item } });
    if (yaLoTiene) {
      throw new Error("RESTRICCION: Ya tienes este item.");
    }

    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    if (personaje.monedas < item.costo) {
      throw new Error("RESTRICCION: No tienes monedas suficientes.");
    }

    personaje.monedas -= item.costo;
    await personaje.save();
    await UsuarioItem.create({ id_usuario, id_item });

    return { monedas_restantes: personaje.monedas, item };
  }

  static async equiparItem(id_usuario, id_item) {
    const poseido = await UsuarioItem.findOne({
      where: { id_usuario, id_item },
      include: [{ model: ItemTienda, as: "item" }],
    });
    if (!poseido) {
      throw new Error("RESTRICCION: No posees este item.");
    }

    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    personaje.accesorios_equipados = {
      ...personaje.accesorios_equipados,
      [poseido.item.tipo]: id_item,
    };
    await personaje.save();
    return personaje;
  }

  static async desequiparItem(id_usuario, tipo) {
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    const equipados = { ...personaje.accesorios_equipados };
    delete equipados[tipo];
    personaje.accesorios_equipados = equipados;
    await personaje.save();
    return personaje;
  }

  /** Idempotente: crea solo los items que aún no existen (por nombre). */
  static async sembrarTiendaSiVacia() {
    const items = [
      { nombre: "Lentes clásicos", tipo: "GAFAS", color: "#1f2937", costo: 30, rareza: "COMUN" },
      { nombre: "Lentes de sol", tipo: "GAFAS", color: "#0f172a", costo: 50, rareza: "RARO" },
      { nombre: "Birrete de graduación", tipo: "SOMBRERO", color: "#111827", costo: 60, rareza: "RARO" },
      { nombre: "Gorra casual", tipo: "SOMBRERO", color: "#dc2626", costo: 40, rareza: "COMUN" },
      { nombre: "Capa de campeón", tipo: "CAPA", color: "#f59e0b", costo: 100, rareza: "EPICO" },
      { nombre: "Capa básica", tipo: "CAPA", color: "#2563eb", costo: 45, rareza: "COMUN" },
      { nombre: "Mochila aventurera", tipo: "MOCHILA", color: "#92400e", costo: 55, rareza: "COMUN" },
      { nombre: "Marco dorado", tipo: "MARCO", color: "#facc15", costo: 120, rareza: "EPICO" },
      { nombre: "Marco plateado", tipo: "MARCO", color: "#94a3b8", costo: 70, rareza: "RARO" },

      { nombre: "Birrete con borla", tipo: "CABEZA", color: "#1e1b4b", costo: 60, rareza: "COMUN", imagen: "hat_grad.png" },
      { nombre: "Gorro de mago", tipo: "CABEZA", color: "#6d28d9", costo: 90, rareza: "RARO", imagen: "hat_wizard.png" },
      { nombre: "Corona dorada", tipo: "CABEZA", color: "#facc15", costo: 150, rareza: "EPICO", imagen: "crown_gold.png" },
      { nombre: "Gafas redondas", tipo: "OJOS", color: "#1e1b4b", costo: 35, rareza: "COMUN", imagen: "glasses_round.png" },
      { nombre: "Gafas de sol", tipo: "OJOS", color: "#0f172a", costo: 55, rareza: "RARO", imagen: "glasses_sun.png" },
      { nombre: "Capa de héroe", tipo: "ESPALDA", color: "#dc2626", costo: 100, rareza: "RARO", imagen: "cape_hero.png" },
      { nombre: "Alas con plumas", tipo: "ESPALDA", color: "#e2e8f0", costo: 140, rareza: "EPICO", imagen: "wings.png" },
      { nombre: "Espada rayo", tipo: "MANO", color: "#facc15", costo: 120, rareza: "EPICO", imagen: "sword_bolt.png" },
      { nombre: "Escudo de madera", tipo: "MANO", color: "#92400e", costo: 70, rareza: "COMUN", imagen: "shield_wood.png" },
      { nombre: "Libro abierto", tipo: "MANO", color: "#2563eb", costo: 50, rareza: "COMUN", imagen: "book_open.png" },
      { nombre: "Sudadera azul", tipo: "CUERPO", color: "#2563eb", costo: 65, rareza: "COMUN", imagen: "hoodie_blue.png" },
      { nombre: "Peto de armadura", tipo: "CUERPO", color: "#94a3b8", costo: 130, rareza: "EPICO", imagen: "armor_silver.png" },
    ];

    for (const item of items) {
      await ItemTienda.findOrCreate({ where: { nombre: item.nombre }, defaults: item });
    }
  }
}
