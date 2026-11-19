import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { Personaje } from "../models/personaje.models/personaje.js";
import { ItemTienda } from "../models/personaje.models/itemTienda.js";
import { UsuarioItem } from "../models/personaje.models/usuarioItem.js";
import { Usuario } from "../models/security.models/usuarioModel.js";

const XP_POR_NIVEL = 100;
const LIMITE_MONEDAS_LECCION_DIA = 30;

// Skin equipada por defecto; siempre hay una equipada. Todas las skins con
// costo 0 se regalan, así cada estudiante elige la que prefiera.
const SKIN_INICIAL = "Estudiante";
export const SKIN_INICIAL_IMAGEN = "skins/estudiante.png";
// Lo que se puede tener y equipar (uno de cada tipo a la vez).
const TIPOS_EQUIPABLES = ["SKIN", "AVATAR"];
const COSTO_AVATAR = 10;

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

  /**
   * Regala las skins gratuitas que falten (incluye las que se agreguen
   * después) y, si no hay ninguna equipada, equipa la inicial.
   */
  static async #asegurarSkin(personaje) {
    const gratis = await ItemTienda.findAll({
      where: { tipo: "SKIN", costo: 0, activo: true },
      attributes: ["id_item", "nombre"],
    });
    if (!gratis.length) return; // tienda aún no sembrada
    await UsuarioItem.bulkCreate(
      gratis.map((g) => ({ id_usuario: personaje.id_usuario, id_item: g.id_item })),
      { ignoreDuplicates: true },
    );

    if (personaje.accesorios_equipados?.SKIN) return;
    const inicial = gratis.find((g) => g.nombre === SKIN_INICIAL) || gratis[0];
    personaje.accesorios_equipados = { SKIN: inicial.id_item };
    await personaje.save();
  }

  static async obtenerPerfil(id_usuario) {
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    await PersonajeService.#asegurarSkin(personaje);
    const inventario = await UsuarioItem.findAll({
      where: { id_usuario },
      include: [{ model: ItemTienda, as: "item", where: { tipo: TIPOS_EQUIPABLES } }],
    });

    return {
      ...personaje.get({ plain: true }),
      xp_para_siguiente_nivel: personaje.nivel * XP_POR_NIVEL,
      inventario: inventario.map((ui) => ui.item),
    };
  }

  /**
   * Imagen de la skin equipada de varios usuarios (para el duelo, rankings).
   * Dos consultas sin importar cuántos sean. Quien no tenga personaje o skin
   * sale con la inicial.
   */
  static async skinsDeUsuarios(ids) {
    const resultado = new Map(ids.map((id) => [id, SKIN_INICIAL_IMAGEN]));
    if (!ids.length) return resultado;
    const personajes = await Personaje.findAll({
      where: { id_usuario: ids },
      attributes: ["id_usuario", "accesorios_equipados"],
    });
    const skinPorUsuario = new Map(
      personajes
        .filter((p) => p.accesorios_equipados?.SKIN)
        .map((p) => [p.id_usuario, p.accesorios_equipados.SKIN]),
    );
    const items = await ItemTienda.findAll({
      where: { id_item: [...new Set(skinPorUsuario.values())] },
      attributes: ["id_item", "imagen"],
    });
    const imagenPorItem = new Map(items.map((i) => [i.id_item, i.imagen]));
    for (const [id_usuario, id_item] of skinPorUsuario) {
      const imagen = imagenPorItem.get(id_item);
      if (imagen) resultado.set(id_usuario, imagen);
    }
    return resultado;
  }

  /** Monedas proporcionales al resultado: 9 de 10 aciertos con máximo 10 -> 9. */
  static monedasPorResultado(correctas, total, maximo) {
    return total > 0 ? Math.round((correctas / total) * maximo) : 0;
  }

  /** Otorga monedas + xp por igual (examen, duelo). Sin tope diario. */
  static async otorgarMonedas(id_usuario, cantidad) {
    const n = parseInt(cantidad, 10);
    if (!(n > 0)) return;
    await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    // Un solo UPDATE: dos premios simultáneos no se pisan.
    await Personaje.update(
      {
        monedas: sequelize.literal(`monedas + ${n}`),
        xp: sequelize.literal(`xp + ${n}`),
        nivel: sequelize.literal(`FLOOR((xp + ${n}) / ${XP_POR_NIVEL}) + 1`),
      },
      { where: { id_usuario } },
    );
  }

  /**
   * Otorga las monedas de una lección, con tope diario para evitar que se
   * farmee infinito repitiendo la misma lección.
   */
  static async otorgarMonedasLeccion(id_usuario, monedas) {
    if (!(monedas > 0)) return 0;
    await PersonajeService.obtenerOCrearPersonaje(id_usuario);

    // Bloquea la fila: dos lecciones simultáneas no pueden saltarse el tope.
    return sequelize.transaction(async (transaction) => {
      const personaje = await Personaje.findOne({
        where: { id_usuario },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      // "Hoy" en hora de Ecuador, no en UTC (que cambia de día a las 19:00).
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
      if (personaje.fecha_monedas_leccion !== hoy) {
        personaje.fecha_monedas_leccion = hoy;
        personaje.monedas_hoy_leccion = 0;
      }

      const disponible = LIMITE_MONEDAS_LECCION_DIA - personaje.monedas_hoy_leccion;
      const aOtorgar = Math.max(0, Math.min(monedas, disponible));

      if (aOtorgar > 0) {
        personaje.monedas += aOtorgar;
        personaje.xp += aOtorgar;
        personaje.nivel = PersonajeService.#calcularNivel(personaje.xp);
        personaje.monedas_hoy_leccion += aOtorgar;
      }
      await personaje.save({ transaction });
      return aOtorgar;
    });
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

    await PersonajeService.obtenerOCrearPersonaje(id_usuario);

    // Descuento condicionado + alta del item en una transacción: no hay saldo
    // negativo por compras simultáneas ni monedas cobradas sin item.
    return sequelize.transaction(async (transaction) => {
      const [, filas] = await Personaje.update(
        { monedas: sequelize.literal(`monedas - ${item.costo}`) },
        {
          where: { id_usuario, monedas: { [Op.gte]: item.costo } },
          returning: true,
          transaction,
        },
      );
      if (!filas.length) {
        throw new Error("RESTRICCION: No tienes monedas suficientes.");
      }
      try {
        await UsuarioItem.create({ id_usuario, id_item }, { transaction });
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          throw new Error("RESTRICCION: Ya tienes este item.");
        }
        throw error;
      }
      return { monedas_restantes: filas[0].monedas, item };
    });
  }

  static async equiparItem(id_usuario, id_item) {
    const poseido = await UsuarioItem.findOne({
      where: { id_usuario, id_item },
      include: [{ model: ItemTienda, as: "item" }],
    });
    if (!poseido) {
      throw new Error("RESTRICCION: No posees este item.");
    }

    const { tipo, imagen } = poseido.item;
    if (!TIPOS_EQUIPABLES.includes(tipo)) {
      throw new Error("RESTRICCION: Este item no se puede equipar.");
    }

    // Uno por tipo; reemplaza al anterior del mismo tipo.
    const personaje = await PersonajeService.obtenerOCrearPersonaje(id_usuario);
    personaje.accesorios_equipados = { ...personaje.accesorios_equipados, [tipo]: id_item };
    await personaje.save();

    // El retrato pasa a ser la foto de perfil (navbar, duelo, historial...).
    // La foto subida antes no se borra del disco; si vuelve a subir una, la reemplaza.
    let url_foto;
    if (tipo === "AVATAR") {
      url_foto = `/personajes/${imagen}`;
      await Usuario.update({ url_foto }, { where: { id_usuario } });
    }
    return { accesorios_equipados: personaje.accesorios_equipados, url_foto };
  }

  /**
   * Idempotente: crea las skins que falten y actualiza las existentes (esta
   * lista es la fuente de verdad de la tienda). Los accesorios del sistema
   * anterior (mascotas por capas) se desactivan y se devuelven sus monedas.
   */
  static async sembrarTiendaSiVacia() {
    // Skins: personaje completo, PNG vertical con fondo transparente en
    // client/public/personajes/skins/. Para agregar una, copia el PNG ahí y
    // añade una línea aquí; aparece en la tienda al reiniciar el servidor.
    const skins = [
      { nombre: SKIN_INICIAL, color: "#6b7280", costo: 0, rareza: "COMUN", imagen: SKIN_INICIAL_IMAGEN },
      { nombre: "Universitaria", color: "#9ca3af", costo: 0, rareza: "COMUN", imagen: "skins/universitaria.png" },
      { nombre: "Cazador del Bosque", color: "#1f4d3a", costo: 100, rareza: "EPICO", imagen: "skins/cazador_bosque.png" },
      { nombre: "Arquera Lunar", color: "#1e2a5a", costo: 100, rareza: "EPICO", imagen: "skins/arquera_lunar.png" },
      { nombre: "Rebelde", color: "#4b5563", costo: 50, rareza: "RARO", imagen: "skins/rebelde.png" },
      { nombre: "Melena Roja", color: "#b91c1c", costo: 50, rareza: "RARO", imagen: "skins/melena_roja.png" },
      { nombre: "Arquero Carmesí", color: "#7f1d1d", costo: 100, rareza: "EPICO", imagen: "skins/arquero_carmesi.png" },
      { nombre: "Caballera Escarlata", color: "#111827", costo: 100, rareza: "EPICO", imagen: "skins/caballera_escarlata.png" },
    ];

    // Cada skin trae su retrato para foto de perfil (client/public/personajes/avatars/,
    // mismo nombre de archivo que la skin).
    const avatares = skins.map((s) => ({
      nombre: `Retrato ${s.nombre}`,
      color: s.color,
      costo: COSTO_AVATAR,
      rareza: s.rareza,
      imagen: s.imagen.replace("skins/", "avatars/"),
      tipo: "AVATAR",
    }));

    for (const skin of [...skins.map((s) => ({ ...s, tipo: "SKIN" })), ...avatares]) {
      const datos = { ...skin, activo: true };
      const [item, creado] = await ItemTienda.findOrCreate({ where: { nombre: skin.nombre }, defaults: datos });
      if (!creado) await item.update(datos);
    }

    // Accesorios comprados con el sistema anterior: se devuelve lo pagado.
    const comprados = await UsuarioItem.findAll({
      include: [{ model: ItemTienda, as: "item", where: { tipo: { [Op.notIn]: TIPOS_EQUIPABLES } } }],
    });
    for (const ui of comprados) {
      await sequelize.transaction(async (transaction) => {
        await Personaje.update(
          { monedas: sequelize.literal(`monedas + ${ui.item.costo}`) },
          { where: { id_usuario: ui.id_usuario }, transaction },
        );
        await ui.destroy({ transaction });
      });
    }
    if (comprados.length) {
      console.info(`🪙 Tienda: ${comprados.length} accesorio(s) antiguo(s) reembolsado(s).`);
    }
    await ItemTienda.update({ activo: false }, { where: { tipo: { [Op.notIn]: TIPOS_EQUIPABLES } } });
  }
}
