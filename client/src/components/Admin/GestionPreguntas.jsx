import { useEffect, useMemo, useState } from "react";
import {
  FileQuestion,
  TableProperties,
  PenLine,
  X,
  ChevronLeft,
  List,
  ToggleLeft,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ArrowLeft,
  Settings,
  Link2,
  ArrowUpDown,
  AlignLeft,
  SquareCheck,
  MoveUp,
  MoveDown,
  Power,
  PowerOff,
} from "lucide-react";
import { api } from "../../services/api";
import CargaExcel from "./Cargaexcel";
import "./AdminEstilos/GesPreguntas.css";
import CompletarRenderer from "../Materias/completar/CompletarRenderer";
import { parseCompletarText } from "../Materias/completar/completarParser";
import {
  resolveCompletarMode,
  serializeCompletarState,
} from "../Materias/completar/completarState";
import {
  featureFlags,
  resolveCompletarInteractionMode,
} from "../../config/featureFlags.js";

const VISTA = {
  LISTA: "lista",
  CONFIG: "config",
  MODO: "modo",
  TIPO: "tipo",
  FORM: "form",
  EXCEL: "excel",
};

const TIPOS = [
  {
    key: "MULTIPLE",
    label: "Opción Múltiple",
    short: "Múltiple",
    icon: List,
    hint: "Una sola respuesta correcta",
  },
  {
    key: "SELECCION_MULTIPLE",
    label: "Selección Múltiple",
    short: "Selección múltiple",
    icon: SquareCheck,
    hint: "Varias respuestas correctas",
  },
  {
    key: "ORDENAR",
    label: "Ordenar",
    short: "Ordenar",
    icon: ArrowUpDown,
    hint: "Orden correcto de ítems",
  },
  {
    key: "RELACIONAR",
    label: "Relacionar",
    short: "Relacionar",
    icon: Link2,
    hint: "Emparejar conceptos",
  },
  {
    key: "VERDADERO_FALSO",
    label: "Verdadero / Falso",
    short: "V/F",
    icon: ToggleLeft,
    hint: "Dos opciones cerradas",
  },
  {
    key: "COMPLETAR",
    label: "Completar",
    short: "Completar",
    icon: AlignLeft,
    hint: "Espacios con respuestas aceptadas",
  },
];

const mapTipo = Object.fromEntries(TIPOS.map((t) => [t.key, t]));

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const letraDesdeIndice = (idx) => String.fromCharCode(65 + idx);
const COMPLETAR_DRAG_ENABLED = featureFlags.completarV2DragEnabled;

const extraerMarcadores = (texto = "") => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const ids = [];
  let match;
  while ((match = regex.exec(texto))) {
    const id = String(match[1] || "").trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
};

const syncEspaciosConTexto = (texto = "", espaciosPrevios = []) => {
  const ids = extraerMarcadores(texto);
  const prevMap = new Map(
    (espaciosPrevios || []).map((esp) => [esp.espacio_id, esp.valores || ""]),
  );
  return ids.map((id, idx) => ({
    _id: uid(),
    espacio_id: id,
    posicion: idx + 1,
    valores: prevMap.get(id) || "",
  }));
};

const nuevaOpcion = (id = "", texto = "") => ({ _id: uid(), id, texto });

const estructuraBase = (tipo) => {
  if (tipo === "MULTIPLE") {
    return {
      opciones: [
        nuevaOpcion("A"),
        nuevaOpcion("B"),
        nuevaOpcion("C"),
        nuevaOpcion("D"),
      ],
      correcta: "A",
      explicacion: "",
    };
  }
  if (tipo === "SELECCION_MULTIPLE") {
    return {
      opciones: [
        nuevaOpcion("A"),
        nuevaOpcion("B"),
        nuevaOpcion("C"),
        nuevaOpcion("D"),
      ],
      correctas: ["A", "B"],
      explicacion: "",
    };
  }
  if (tipo === "ORDENAR") {
    return {
      items: [
        { _id: uid(), texto: "" },
        { _id: uid(), texto: "" },
        { _id: uid(), texto: "" },
        { _id: uid(), texto: "" },
      ],
      explicacion: "",
    };
  }
  if (tipo === "RELACIONAR") {
    return {
      pares: [
        { _id: uid(), izquierda: "", derecha: "" },
        { _id: uid(), izquierda: "", derecha: "" },
        { _id: uid(), izquierda: "", derecha: "" },
        { _id: uid(), izquierda: "", derecha: "" },
      ],
      explicacion: "",
    };
  }
  if (tipo === "VERDADERO_FALSO") {
    return { correcta: "V", explicacion: "" };
  }
  return {
    modo_interaccion: "ESCRIBIR",
    texto: "",
    espacios: [{ _id: uid(), espacio_id: "B1", posicion: 1, valores: "" }],
    opciones_arrastrar: [
      { _id: uid(), ficha_id: "F1", texto: "" },
      { _id: uid(), ficha_id: "F2", texto: "" },
    ],
    explicacion: "",
  };
};

const legacyToEstructura = (tipo, opciones = []) => {
  if (tipo === "VERDADERO_FALSO") {
    const correcta = opciones.find((o) => o.es_correcta);
    return {
      tipo,
      opciones: [
        { opcion_id: "V", texto: "Verdadero" },
        { opcion_id: "F", texto: "Falso" },
      ],
      respuesta: { opcion_id: correcta?.texto === "Falso" ? "F" : "V" },
    };
  }
  const map = opciones.map((o, idx) => ({
    opcion_id: String.fromCharCode(65 + idx),
    texto: o.texto,
    es_correcta: o.es_correcta,
  }));
  return {
    tipo,
    opciones: map.map((o) => ({ opcion_id: o.opcion_id, texto: o.texto })),
    respuesta: {
      opcion_id: map.find((o) => o.es_correcta)?.opcion_id || map[0]?.opcion_id,
    },
  };
};

const hydrateForm = (tipo, estructura_json, opcionesLegacy) => {
  const estructura =
    estructura_json || legacyToEstructura(tipo, Array.isArray(opcionesLegacy) ? opcionesLegacy : []);
  if (!estructura) return estructuraBase(tipo);

  if (tipo === "MULTIPLE") {
    return {
      opciones: (estructura.opciones || []).map((o) =>
        nuevaOpcion(o.opcion_id, o.texto),
      ),
      correcta: estructura.respuesta?.opcion_id || "A",
      explicacion: estructura.explicacion || "",
    };
  }
  if (tipo === "SELECCION_MULTIPLE") {
    return {
      opciones: (estructura.opciones || []).map((o) =>
        nuevaOpcion(o.opcion_id, o.texto),
      ),
      correctas: estructura.respuesta?.opciones_ids || [],
      explicacion: estructura.explicacion || "",
    };
  }
  if (tipo === "ORDENAR") {
    return {
      items: (estructura.items || []).map((i) => ({ _id: uid(), texto: i.texto })),
      explicacion: estructura.explicacion || "",
    };
  }
  if (tipo === "RELACIONAR") {
    const izquierdaMap = new Map(
      (estructura.izquierda || []).map((i) => [i.izquierda_id, i.texto]),
    );
    const derechaMap = new Map(
      (estructura.derecha || []).map((d) => [d.derecha_id, d.texto]),
    );
    const pares = (estructura.respuesta?.pares || [])
      .map((p) => ({
        _id: uid(),
        izquierda: izquierdaMap.get(p.izquierda_id) || "",
        derecha: derechaMap.get(p.derecha_id) || "",
      }))
      .filter((p) => p.izquierda || p.derecha);

    return {
      pares:
        pares.length > 0
          ? pares
          : [
              { _id: uid(), izquierda: "", derecha: "" },
              { _id: uid(), izquierda: "", derecha: "" },
            ],
      explicacion: estructura.explicacion || "",
    };
  }
  if (tipo === "VERDADERO_FALSO") {
    return {
      correcta: estructura.respuesta?.opcion_id || "V",
      explicacion: estructura.explicacion || "",
    };
  }
  return {
    modo_interaccion: resolveCompletarInteractionMode(estructura.modo_interaccion).resolved,
    texto: estructura.texto || "",
    espacios: syncEspaciosConTexto(estructura.texto || "", (estructura.espacios || []).map((e) => {
      const aceptada = (estructura.respuesta?.aceptadas || []).find(
        (a) => a.espacio_id === e.espacio_id,
      );
      return {
        espacio_id: e.espacio_id,
        valores: (aceptada?.valores || []).join(", "),
      };
    })),
    opciones_arrastrar: (estructura.opciones_arrastrar || []).map((f, idx) => ({
      _id: uid(),
      ficha_id: f.ficha_id || `F${idx + 1}`,
      texto: f.texto || "",
    })),
    explicacion: estructura.explicacion || "",
  };
};

export default function GestionPreguntas() {
  const [materias, setMaterias] = useState([]);
  const [loadingMaterias, setLoadingMaterias] = useState(true);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  const [preguntas, setPreguntas] = useState([]);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);

  const [vista, setVista] = useState(VISTA.LISTA);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editando, setEditando] = useState(null);
  const [tipoPregunta, setTipoPregunta] = useState(null);
  const [enunciado, setEnunciado] = useState("");
  const [urlImagen, setUrlImagen] = useState("");
  const [estructuraForm, setEstructuraForm] = useState(estructuraBase("MULTIPLE"));
  const [previewCompletar, setPreviewCompletar] = useState({});
  const [errForm, setErrForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [configuraciones, setConfiguraciones] = useState([]);
  const [cfgModo, setCfgModo] = useState("TEST");
  const [cfgTiempo, setCfgTiempo] = useState("");
  const [cfgIntentos, setCfgIntentos] = useState("");
  const [cfgErrForm, setCfgErrForm] = useState("");
  const [cfgGuardando, setCfgGuardando] = useState(false);
  const [eliminandoCfg, setEliminandoCfg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMaterias();
        setMaterias(res.data || []);
      } catch {
        setError("Error al cargar materias.");
      } finally {
        setLoadingMaterias(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!materiaSeleccionada) return;
    cargarPreguntas(materiaSeleccionada.id_materia);
    cargarConfiguraciones(materiaSeleccionada.id_materia);
  }, [materiaSeleccionada]);

  const cargarPreguntas = async (id) => {
    setLoadingPreguntas(true);
    setError("");
    try {
      const res = await api.getPreguntasPorMateria(id, false);
      setPreguntas(res.data || []);
    } catch (e) {
      setError(e.message || "Error al cargar preguntas.");
    } finally {
      setLoadingPreguntas(false);
    }
  };

  const cargarConfiguraciones = async (id) => {
    try {
      const res = await api.getConfiguracionesPorMateria(id);
      setConfiguraciones(res.data?.configuraciones || []);
    } catch {
      setConfiguraciones([]);
    }
  };

  const toast = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const limpiarPrefijoError = (msg = "") =>
    String(msg)
      .replace(/^RESTRICCION:\s*/i, "")
      .replace(/^VALIDACION:\s*/i, "")
      .trim();

  const irA = (v) => {
    setErrForm("");
    setVista(v);
  };

  const resetForm = () => {
    setEditando(null);
    setTipoPregunta(null);
    setEnunciado("");
    setUrlImagen("");
    setEstructuraForm(estructuraBase("MULTIPLE"));
    setPreviewCompletar({});
    setErrForm("");
  };

  const volverALista = () => {
    resetForm();
    irA(VISTA.LISTA);
  };

  const seleccionarTipo = (tipo) => {
    setTipoPregunta(tipo);
    setEstructuraForm(estructuraBase(tipo));
    setPreviewCompletar({});
    irA(VISTA.FORM);
  };

  const abrirEditar = (pregunta) => {
    setEditando(pregunta);
    setTipoPregunta(pregunta.tipo_pregunta);
    setEnunciado(pregunta.enunciado || "");
    setUrlImagen(pregunta.url_imagen || "");
    setEstructuraForm(
      hydrateForm(
        pregunta.tipo_pregunta,
        pregunta.estructura_json,
        pregunta.opciones,
      ),
    );
    setPreviewCompletar({});
    irA(VISTA.FORM);
  };

  const abrirConfig = (modoPreseleccionado = "TEST") => {
    const existente = configuraciones.find((c) => c.modo === modoPreseleccionado);
    setCfgModo(modoPreseleccionado);
    setCfgTiempo(
      existente?.tiempo_limite_min ? String(existente.tiempo_limite_min) : "",
    );
    setCfgIntentos(
      modoPreseleccionado === "EXAMEN"
        ? existente?.intentos_permitidos === null ||
          existente?.intentos_permitidos === undefined
          ? ""
          : String(existente.intentos_permitidos)
        : "",
    );
    setCfgErrForm("");
    irA(VISTA.CONFIG);
  };

  const handleGuardarConfig = async () => {
    if (
      cfgTiempo !== "" &&
      (isNaN(parseInt(cfgTiempo, 10)) || parseInt(cfgTiempo, 10) < 1)
    ) {
      return setCfgErrForm(
        "El tiempo debe ser un número mayor a 0, o déjalo vacío para sin límite.",
      );
    }
    if (cfgModo === "EXAMEN" && cfgIntentos !== "") {
      const intentosNum = Number(cfgIntentos);
      if (!Number.isInteger(intentosNum) || intentosNum < 1) {
        return setCfgErrForm(
          "Los intentos deben ser un entero mayor a 0, o déjalo vacío para infinito.",
        );
      }
    }

    setCfgGuardando(true);
    setCfgErrForm("");
    try {
      await api.upsertConfiguracion(materiaSeleccionada.id_materia, {
        modo: cfgModo,
        tiempo_limite_min: cfgTiempo !== "" ? parseInt(cfgTiempo, 10) : null,
        intentos_permitidos:
          cfgModo === "TEST"
            ? null
            : cfgIntentos !== ""
              ? parseInt(cfgIntentos, 10)
              : null,
      });
      await cargarConfiguraciones(materiaSeleccionada.id_materia);
      toast(`Configuración ${cfgModo} guardada.`);
      irA(VISTA.LISTA);
    } catch (e) {
      setCfgErrForm(e.message || "Error al guardar.");
    } finally {
      setCfgGuardando(false);
    }
  };

  const handleEliminarConfig = async (cfg) => {
    if (!window.confirm(`¿Eliminar configuración ${cfg.modo}?`)) return;
    setEliminandoCfg(cfg.id_config);
    try {
      await api.eliminarConfiguracion(cfg.id_config);
      await cargarConfiguraciones(materiaSeleccionada.id_materia);
      toast("Configuración eliminada.");
    } catch (e) {
      setError(e.message?.replace("RESTRICCION: ", "") || "Error al eliminar.");
    } finally {
      setEliminandoCfg(null);
    }
  };

  const tipoMeta = useMemo(() => mapTipo[tipoPregunta], [tipoPregunta]);
  const TipoFormIcon = tipoMeta?.icon;

  const validarYEstructura = () => {
    if (!enunciado.trim()) {
      return { error: "El enunciado es obligatorio." };
    }

    if (tipoPregunta === "MULTIPLE") {
      const opciones = (estructuraForm.opciones || [])
        .map((o) => ({ id: String(o.id || "").trim(), texto: String(o.texto || "").trim() }))
        .filter((o) => o.texto);

      if (opciones.length < 2 || opciones.length > 6) {
        return { error: "MULTIPLE requiere entre 2 y 6 opciones válidas." };
      }

      const correcta = String(estructuraForm.correcta || "").trim();
      if (!correcta || !opciones.some((o) => o.id === correcta)) {
        return { error: "Debes marcar exactamente 1 opción correcta." };
      }

      return {
        estructura: {
          tipo: "MULTIPLE",
          opciones: opciones.map((o) => ({ opcion_id: o.id, texto: o.texto })),
          respuesta: { opcion_id: correcta },
          ...(estructuraForm.explicacion?.trim()
            ? { explicacion: estructuraForm.explicacion.trim() }
            : {}),
        },
      };
    }

    if (tipoPregunta === "SELECCION_MULTIPLE") {
      const opciones = (estructuraForm.opciones || [])
        .map((o) => ({ id: String(o.id || "").trim(), texto: String(o.texto || "").trim() }))
        .filter((o) => o.texto);
      const correctas = (estructuraForm.correctas || []).filter((id) =>
        opciones.some((o) => o.id === id),
      );

      if (opciones.length < 3 || opciones.length > 8) {
        return { error: "SELECCION_MULTIPLE requiere entre 3 y 8 opciones válidas." };
      }
      if (correctas.length < 2 || correctas.length >= opciones.length) {
        return {
          error:
            "Debes marcar al menos 2 respuestas correctas y dejar al menos 1 incorrecta.",
        };
      }

      return {
        estructura: {
          tipo: "SELECCION_MULTIPLE",
          opciones: opciones.map((o) => ({ opcion_id: o.id, texto: o.texto })),
          respuesta: { opciones_ids: correctas },
          ...(estructuraForm.explicacion?.trim()
            ? { explicacion: estructuraForm.explicacion.trim() }
            : {}),
        },
      };
    }

    if (tipoPregunta === "ORDENAR") {
      const items = (estructuraForm.items || [])
        .map((i) => String(i.texto || "").trim())
        .filter(Boolean);
      if (items.length < 3 || items.length > 8) {
        return { error: "ORDENAR requiere entre 3 y 8 ítems válidos." };
      }

      return {
        estructura: {
          tipo: "ORDENAR",
          items: items.map((texto, idx) => ({ item_id: `I${idx + 1}`, texto })),
          respuesta: { orden_ids: items.map((_, idx) => `I${idx + 1}`) },
          ...(estructuraForm.explicacion?.trim()
            ? { explicacion: estructuraForm.explicacion.trim() }
            : {}),
        },
      };
    }

    if (tipoPregunta === "RELACIONAR") {
      const filas = (estructuraForm.pares || []).map((par) => ({
        izquierda: String(par.izquierda || "").trim(),
        derecha: String(par.derecha || "").trim(),
      }));
      const incompleta = filas.some((f) => (f.izquierda && !f.derecha) || (!f.izquierda && f.derecha));
      if (incompleta) {
        return { error: "Cada fila de RELACIONAR debe tener izquierda y derecha completas." };
      }

      const completas = filas.filter((f) => f.izquierda && f.derecha);
      if (completas.length < 2 || completas.length > 8) {
        return { error: "RELACIONAR requiere entre 2 y 8 pares completos." };
      }

      const izqNorm = completas.map((f) => f.izquierda.toLowerCase());
      const derNorm = completas.map((f) => f.derecha.toLowerCase());
      if (new Set(izqNorm).size !== izqNorm.length || new Set(derNorm).size !== derNorm.length) {
        return { error: "RELACIONAR no permite textos duplicados en izquierda o derecha." };
      }

      return {
        estructura: {
          tipo: "RELACIONAR",
          izquierda: completas.map((f, idx) => ({ izquierda_id: `L${idx + 1}`, texto: f.izquierda })),
          derecha: completas.map((f, idx) => ({ derecha_id: `R${idx + 1}`, texto: f.derecha })),
          respuesta: {
            pares: completas.map((_, idx) => ({ izquierda_id: `L${idx + 1}`, derecha_id: `R${idx + 1}` })),
          },
          ...(estructuraForm.explicacion?.trim()
            ? { explicacion: estructuraForm.explicacion.trim() }
            : {}),
        },
      };
    }

    if (tipoPregunta === "VERDADERO_FALSO") {
      return {
        estructura: {
          tipo: "VERDADERO_FALSO",
          opciones: [
            { opcion_id: "V", texto: "Verdadero" },
            { opcion_id: "F", texto: "Falso" },
          ],
          respuesta: { opcion_id: estructuraForm.correcta || "V" },
          ...(estructuraForm.explicacion?.trim()
            ? { explicacion: estructuraForm.explicacion.trim() }
            : {}),
        },
      };
    }

    const texto = String(estructuraForm.texto || "").trim();
    if (!texto) {
      return { error: "COMPLETAR requiere un texto base." };
    }

    const modo_interaccion = resolveCompletarInteractionMode(
      estructuraForm.modo_interaccion,
    ).resolved;

    const ids = extraerMarcadores(texto);
    if (ids.length < 1 || ids.length > 8) {
      return { error: "COMPLETAR requiere entre 1 y 8 marcadores [[Bx]] en el texto." };
    }

    if (new Set(ids).size !== ids.length) {
      return { error: "COMPLETAR no permite marcadores repetidos en el enunciado." };
    }

    const espaciosMap = new Map(
      (estructuraForm.espacios || []).map((e) => [e.espacio_id, String(e.valores || "")]),
    );

    const aceptadas = [];
    for (const id of ids) {
      const valores = String(espaciosMap.get(id) || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (valores.length === 0) {
        return { error: `El marcador [[${id}]] requiere al menos una respuesta aceptada.` };
      }
      aceptadas.push({ espacio_id: id, valores });
    }

    const opciones_arrastrar = (estructuraForm.opciones_arrastrar || [])
      .map((f, idx) => ({
        ficha_id: String(f.ficha_id || `F${idx + 1}`).trim(),
        texto: String(f.texto || "").trim(),
      }))
      .filter((f) => f.texto);

    if (modo_interaccion === "ARRASTRAR") {
      if (opciones_arrastrar.length < ids.length || opciones_arrastrar.length > ids.length + 8) {
        return {
          error:
            "En ARRASTRAR debes definir entre N y N+8 fichas (N = cantidad de espacios).",
        };
      }
      const idsFichas = opciones_arrastrar.map((f) => f.ficha_id.toLowerCase());
      if (new Set(idsFichas).size !== idsFichas.length) {
        return { error: "No puede haber ficha_id duplicados en opciones de arrastrar." };
      }
    }

    return {
      estructura: {
        tipo: "COMPLETAR",
        modo_interaccion,
        texto,
        espacios: ids.map((id, idx) => ({ espacio_id: id, posicion: idx + 1 })),
        respuesta: {
          aceptadas,
          normalizacion: "LOWER_TRIM",
        },
        ...(modo_interaccion === "ARRASTRAR" ? { opciones_arrastrar } : {}),
        ...(estructuraForm.explicacion?.trim()
          ? { explicacion: estructuraForm.explicacion.trim() }
          : {}),
      },
    };
  };

  const handleGuardar = async () => {
    const { error: err, estructura } = validarYEstructura();
    if (err) return setErrForm(err);

    setGuardando(true);
    setErrForm("");

    const datos = {
      id_materia: materiaSeleccionada.id_materia,
      enunciado: enunciado.trim(),
      tipo_pregunta: tipoPregunta,
      estructura_json: estructura,
      ...(urlImagen.trim() && { url_imagen: urlImagen.trim() }),
    };

    try {
      if (editando) {
        await api.actualizarPregunta(editando.id_pregunta, datos);
        toast("Pregunta actualizada.");
      } else {
        await api.crearPregunta(datos);
        toast("Pregunta creada.");
      }
      await cargarPreguntas(materiaSeleccionada.id_materia);
      volverALista();
    } catch (e) {
      const msg = e.message || "Error al guardar.";
      setErrForm(
        msg.includes("RESTRICCION") || msg.includes("historial")
          ? "Esta pregunta tiene respuestas registradas. Solo puedes editar enunciado/imagen."
          : msg,
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (p) => {
    if (
      !window.confirm(`¿Desactivar "${p.enunciado.substring(0, 60)}..."? Dejará de estar disponible en nuevos cuestionarios.`)
    )
      return;
    try {
      const res = await api.desactivarPregunta(p.id_pregunta);
      toast(res.mensaje || "Pregunta desactivada.");
      await cargarPreguntas(materiaSeleccionada.id_materia);
    } catch (e) {
      setError(limpiarPrefijoError(e.message) || "Error al desactivar.");
    }
  };

  const handleActivar = async (p) => {
    if (!window.confirm(`¿Activar "${p.enunciado.substring(0, 60)}..."?`)) return;
    try {
      const res = await api.activarPregunta(p.id_pregunta);
      toast(res.mensaje || "Pregunta activada.");
      await cargarPreguntas(materiaSeleccionada.id_materia);
    } catch (e) {
      setError(limpiarPrefijoError(e.message) || "Error al activar.");
    }
  };

  const handleEliminarFisico = async (p) => {
    if (
      !window.confirm(
        `¿Eliminar físicamente "${p.enunciado.substring(0, 60)}..."? Esta acción es permanente y solo aplica si no tiene uso histórico ni intentos en progreso.`,
      )
    )
      return;

    try {
      const res = await api.eliminarPreguntaFisica(p.id_pregunta);
      toast(res.mensaje || "Pregunta eliminada físicamente.");
      await cargarPreguntas(materiaSeleccionada.id_materia);
    } catch (e) {
      setError(
        limpiarPrefijoError(e.message) ||
          "No fue posible eliminar físicamente la pregunta.",
      );
    }
  };

  const renderTipoBadge = (tipo) => {
    const meta = mapTipo[tipo] || { short: tipo, icon: List };
    const Icon = meta.icon;
    return (
      <span className="gp-tipo-badge gp-tipo-mult">
        <Icon size={11} /> {meta.short}
      </span>
    );
  };

  const actualizarOpcion = (index, campo, valor) => {
    setEstructuraForm((prev) => {
      const opciones = [...(prev.opciones || [])];
      opciones[index] = { ...opciones[index], [campo]: valor };
      return { ...prev, opciones };
    });
  };

  const renderSubform = () => {
    if (!tipoPregunta) return null;

    if (tipoPregunta === "MULTIPLE" || tipoPregunta === "SELECCION_MULTIPLE") {
      const esMulti = tipoPregunta === "SELECCION_MULTIPLE";
      const minOpciones = esMulti ? 3 : 2;
      const maxOpciones = esMulti ? 8 : 6;
      return (
        <div className="gp-form-group">
          <label className="gp-label">Opciones</label>
          <p className="gp-hint">
            {esMulti
              ? "Marca al menos 2 correctas. Debe quedar al menos 1 incorrecta."
              : "Marca exactamente 1 respuesta correcta."}
          </p>
          <div className="gp-opciones">
            {(estructuraForm.opciones || []).map((op, idx) => {
              const checked = esMulti
                ? (estructuraForm.correctas || []).includes(op.id)
                : estructuraForm.correcta === op.id;
              return (
                <div
                  key={op._id}
                  className={`gp-opcion-row${checked ? " gp-opcion-row--correct" : ""}`}
                >
                  <button
                    className={`gp-opcion-radio${checked ? " gp-opcion-radio--active" : ""}`}
                    onClick={() => {
                      if (!op.id) return;
                      if (esMulti) {
                        setEstructuraForm((prev) => {
                          const actuales = new Set(prev.correctas || []);
                          if (actuales.has(op.id)) actuales.delete(op.id);
                          else actuales.add(op.id);
                          return { ...prev, correctas: [...actuales] };
                        });
                      } else {
                        setEstructuraForm((prev) => ({ ...prev, correcta: op.id }));
                      }
                    }}
                  >
                    {checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <span className="gp-opts-count">{op.id}</span>
                  <input
                    className="gp-opcion-input"
                    placeholder={`Texto opción ${idx + 1}`}
                    value={op.texto}
                    onChange={(e) =>
                      actualizarOpcion(idx, "texto", e.target.value)
                    }
                  />
                  {(estructuraForm.opciones || []).length > minOpciones && (
                    <button
                      className="gp-opcion-del"
                      onClick={() => {
                        setEstructuraForm((prev) => {
                          const opciones = [...(prev.opciones || [])];
                          const removida = opciones[idx];
                          opciones.splice(idx, 1);
                          return {
                            ...prev,
                            opciones,
                            correcta:
                              prev.correcta === removida.id
                                ? opciones[0]?.id || ""
                                : prev.correcta,
                            correctas: (prev.correctas || []).filter(
                              (id) => id !== removida.id,
                            ),
                          };
                        });
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              );
            })}
            {(estructuraForm.opciones || []).length < maxOpciones && (
              <button
                className="gp-add-opcion"
                onClick={() =>
                  setEstructuraForm((prev) => ({
                    ...prev,
                    opciones: [
                      ...(prev.opciones || []),
                      nuevaOpcion(letraDesdeIndice((prev.opciones || []).length), ""),
                    ],
                  }))
                }
              >
                <Plus size={15} /> Agregar opción
              </button>
            )}
          </div>
        </div>
      );
    }

    if (tipoPregunta === "VERDADERO_FALSO") {
      return (
        <div className="gp-form-group">
          <label className="gp-label">Respuesta correcta</label>
          <div className="gp-vf-row">
            {["V", "F"].map((id) => (
              <div
                key={id}
                className={`gp-vf-card${estructuraForm.correcta === id ? " gp-vf-card--active" : ""}`}
                onClick={() =>
                  setEstructuraForm((prev) => ({ ...prev, correcta: id }))
                }
              >
                {estructuraForm.correcta === id ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Circle size={20} />
                )}
                <span>{id === "V" ? "Verdadero" : "Falso"}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tipoPregunta === "ORDENAR") {
      return (
        <div className="gp-form-group">
          <label className="gp-label">Ítems en orden correcto</label>
          <p className="gp-hint">
            Ingresa los ítems ya ordenados. Este orden se guarda como respuesta correcta.
          </p>
          <div className="gp-opciones">
            {(estructuraForm.items || []).map((it, idx) => (
              <div key={it._id} className="gp-opcion-row">
                <span className="gp-opts-count">#{idx + 1}</span>
                <input
                  className="gp-opcion-input"
                  placeholder={`Ítem ${idx + 1}`}
                  value={it.texto}
                  onChange={(e) =>
                    setEstructuraForm((prev) => {
                      const items = [...(prev.items || [])];
                      items[idx] = { ...items[idx], texto: e.target.value };
                      return { ...prev, items };
                    })
                  }
                />
                <button
                  className="gp-opcion-del"
                  disabled={idx === 0}
                  onClick={() =>
                    setEstructuraForm((prev) => {
                      const items = [...(prev.items || [])];
                      [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                      return { ...prev, items };
                    })
                  }
                >
                  <MoveUp size={15} />
                </button>
                <button
                  className="gp-opcion-del"
                  disabled={idx === (estructuraForm.items || []).length - 1}
                  onClick={() =>
                    setEstructuraForm((prev) => {
                      const items = [...(prev.items || [])];
                      [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
                      return { ...prev, items };
                    })
                  }
                >
                  <MoveDown size={15} />
                </button>
                {(estructuraForm.items || []).length > 3 && (
                  <button
                    className="gp-opcion-del"
                    onClick={() =>
                      setEstructuraForm((prev) => {
                        const items = [...(prev.items || [])];
                        items.splice(idx, 1);
                        return { ...prev, items };
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            {(estructuraForm.items || []).length < 8 && (
              <button
                className="gp-add-opcion"
                onClick={() =>
                  setEstructuraForm((prev) => ({
                    ...prev,
                    items: [...(prev.items || []), { _id: uid(), texto: "" }],
                  }))
                }
              >
                <Plus size={15} /> Agregar ítem
              </button>
            )}
          </div>
        </div>
      );
    }

    if (tipoPregunta === "RELACIONAR") {
      return (
        <div className="gp-form-group">
          <label className="gp-label">Pares correctos</label>
          <p className="gp-hint">
            Completa cada fila con el par correcto izquierda/derecha (mínimo 2 pares).
          </p>
          <div className="gp-opciones">
            {(estructuraForm.pares || []).map((par, idx) => (
              <div key={par._id} className="gp-opcion-row">
                <span className="gp-opts-count">#{idx + 1}</span>
                <input
                  className="gp-input"
                  placeholder="Izquierda"
                  value={par.izquierda}
                  onChange={(e) =>
                    setEstructuraForm((prev) => {
                      const pares = [...(prev.pares || [])];
                      pares[idx] = { ...pares[idx], izquierda: e.target.value };
                      return { ...prev, pares };
                    })
                  }
                />
                <input
                  className="gp-input"
                  placeholder="Derecha"
                  value={par.derecha}
                  onChange={(e) =>
                    setEstructuraForm((prev) => {
                      const pares = [...(prev.pares || [])];
                      pares[idx] = { ...pares[idx], derecha: e.target.value };
                      return { ...prev, pares };
                    })
                  }
                />
                {(estructuraForm.pares || []).length > 2 && (
                  <button
                    className="gp-opcion-del"
                    onClick={() =>
                      setEstructuraForm((prev) => {
                        const pares = [...(prev.pares || [])];
                        pares.splice(idx, 1);
                        return { ...prev, pares };
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            {(estructuraForm.pares || []).length < 8 && (
              <button
                className="gp-add-opcion"
                onClick={() =>
                  setEstructuraForm((prev) => ({
                    ...prev,
                    pares: [...(prev.pares || []), { _id: uid(), izquierda: "", derecha: "" }],
                  }))
                }
              >
                <Plus size={15} /> Agregar par
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="gp-form-group">
          <label className="gp-label">Modo de interacción</label>
          <div className="gp-vf-row">
            {[
              { id: "ESCRIBIR", label: "Escribir" },
              { id: "ARRASTRAR", label: "Arrastrar", disabled: !COMPLETAR_DRAG_ENABLED },
            ].map((modo) => (
              <div
                key={modo.id}
                className={`gp-vf-card${(estructuraForm.modo_interaccion || "ESCRIBIR") === modo.id ? " gp-vf-card--active" : ""}`}
                onClick={() => {
                  if (modo.disabled) return;
                  setEstructuraForm((prev) => ({
                    ...prev,
                    modo_interaccion: modo.id,
                  }));
                }}
                style={modo.disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                {(estructuraForm.modo_interaccion || "ESCRIBIR") === modo.id ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Circle size={20} />
                )}
                <span>
                  {modo.label}
                  {modo.disabled ? " (deshabilitado por feature flag)" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="gp-form-group">
          <label className="gp-label">Texto con marcadores</label>
          <p className="gp-hint">
            Usa marcadores como [[B1]], [[B2]]. Se generarán automáticamente los campos por hueco.
          </p>
          <textarea
            className="gp-textarea"
            rows={3}
            placeholder="Ej: La capital de [[B1]] es [[B2]]."
            value={estructuraForm.texto || ""}
            onChange={(e) =>
              setEstructuraForm((prev) => ({
                ...prev,
                texto: e.target.value,
                espacios: syncEspaciosConTexto(e.target.value, prev.espacios || []),
              }))
            }
          />
        </div>
        <div className="gp-form-group">
          <label className="gp-label">Respuestas aceptadas por hueco</label>
          <p className="gp-hint">Separa variantes con coma (ej: chile, República de Chile).</p>
          {(estructuraForm.espacios || []).map((esp, idx) => (
            <div key={esp._id} className="gp-opcion-row">
              <span className="gp-opts-count">[[{esp.espacio_id || `B${idx + 1}`}]]</span>
              <input
                className="gp-opcion-input"
                placeholder="Valores aceptados separados por coma"
                value={esp.valores}
                onChange={(e) =>
                  setEstructuraForm((prev) => {
                    const espacios = [...(prev.espacios || [])];
                    espacios[idx] = { ...espacios[idx], valores: e.target.value };
                    return { ...prev, espacios };
                  })
                }
              />
            </div>
          ))}
          {!(estructuraForm.espacios || []).length && (
            <div className="gp-hint">Agrega al menos un marcador [[Bx]] en el texto.</div>
          )}
        </div>

        {(estructuraForm.modo_interaccion || "ESCRIBIR") === "ARRASTRAR" && (
          <div className="gp-form-group">
            <label className="gp-label">Fichas del banco (ARRASTRAR)</label>
            <p className="gp-hint">Cada ficha requiere un id único y un texto visible.</p>
            {(estructuraForm.opciones_arrastrar || []).map((ficha, idx) => (
              <div key={ficha._id} className="gp-opcion-row">
                <input
                  className="gp-input"
                  value={ficha.ficha_id}
                  placeholder={`F${idx + 1}`}
                  onChange={(e) =>
                    setEstructuraForm((prev) => {
                      const opciones_arrastrar = [...(prev.opciones_arrastrar || [])];
                      opciones_arrastrar[idx] = {
                        ...opciones_arrastrar[idx],
                        ficha_id: e.target.value,
                      };
                      return { ...prev, opciones_arrastrar };
                    })
                  }
                />
                <input
                  className="gp-opcion-input"
                  value={ficha.texto}
                  placeholder="Texto ficha"
                  onChange={(e) =>
                    setEstructuraForm((prev) => {
                      const opciones_arrastrar = [...(prev.opciones_arrastrar || [])];
                      opciones_arrastrar[idx] = {
                        ...opciones_arrastrar[idx],
                        texto: e.target.value,
                      };
                      return { ...prev, opciones_arrastrar };
                    })
                  }
                />
                {(estructuraForm.opciones_arrastrar || []).length > 1 && (
                  <button
                    className="gp-opcion-del"
                    onClick={() =>
                      setEstructuraForm((prev) => {
                        const opciones_arrastrar = [...(prev.opciones_arrastrar || [])];
                        opciones_arrastrar.splice(idx, 1);
                        return { ...prev, opciones_arrastrar };
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            {(estructuraForm.opciones_arrastrar || []).length < 16 && (
              <button
                className="gp-add-opcion"
                onClick={() =>
                  setEstructuraForm((prev) => ({
                    ...prev,
                    opciones_arrastrar: [
                      ...(prev.opciones_arrastrar || []),
                      {
                        _id: uid(),
                        ficha_id: `F${(prev.opciones_arrastrar || []).length + 1}`,
                        texto: "",
                      },
                    ],
                  }))
                }
              >
                <Plus size={15} /> Agregar ficha
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="gp-root">
      {success && (
        <div className="gp-toast">
          <CheckCheck size={16} />
          {success}
        </div>
      )}

      <div className="gp-topbar">
        <div className="gp-topbar-left">
          {vista !== VISTA.LISTA && (
            <button className="gp-back-btn" onClick={volverALista}>
              <ArrowLeft size={16} /> Volver
            </button>
          )}
          <div>
            <h2 className="gp-title">Gestión de Preguntas</h2>
            <p className="gp-subtitle">
              {materiaSeleccionada ? (
                <>
                  Banco de preguntas de <strong>{materiaSeleccionada.nombre}</strong>
                </>
              ) : (
                "Selecciona una materia para comenzar"
              )}
            </p>
          </div>
        </div>

        <div className="gp-materia-selector">
          <button
            className="gp-materia-btn"
            onClick={() => setDropdownAbierto((v) => !v)}
            disabled={loadingMaterias}
          >
            <BookOpen size={15} />
            <span>
              {materiaSeleccionada ? materiaSeleccionada.nombre : "Seleccionar materia"}
            </span>
            <ChevronDown size={15} className={dropdownAbierto ? "gp-chevron-open" : ""} />
          </button>
          {dropdownAbierto && (
            <div className="gp-dropdown">
              {loadingMaterias ? (
                <div className="gp-dropdown-loading">Cargando...</div>
              ) : (
                materias.map((m) => (
                  <button
                    key={m.id_materia}
                    className={`gp-dropdown-item${materiaSeleccionada?.id_materia === m.id_materia ? " gp-dropdown-item--active" : ""}`}
                    onClick={() => {
                      setMateriaSeleccionada(m);
                      setDropdownAbierto(false);
                      setVista(VISTA.LISTA);
                      resetForm();
                    }}
                  >
                    {m.nombre}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="gp-error-banner">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {!materiaSeleccionada && (
        <div className="gp-no-materia">
          <div className="gp-no-materia-icon">
            <BookOpen size={28} />
          </div>
          <h3>Selecciona una materia</h3>
        </div>
      )}

      {materiaSeleccionada && vista === VISTA.LISTA && (
        <>
          <div className="gp-actions-row">
            <div className="gp-action-card" onClick={() => irA(VISTA.MODO)}>
              <div className="gp-action-icon gp-icon-blue">
                <FileQuestion size={26} />
              </div>
              <div>
                <h3 className="gp-action-title">Editar Cuestionario</h3>
                <p className="gp-action-desc">Gestiona preguntas manuales en 6 tipos.</p>
              </div>
            </div>

            <div
              className="gp-action-card gp-action-card--config"
              onClick={() => abrirConfig("TEST")}
            >
              <div className="gp-action-icon gp-icon-amber">
                <Settings size={22} />
              </div>
              <div>
                <h3 className="gp-action-title">Configurar Cuestionario</h3>
                <p className="gp-action-desc">
                  Define modo, tiempo límite e intentos permitidos.
                </p>
              </div>
            </div>
          </div>

          <div className="gp-section-header">
            <h3 className="gp-section-title">Preguntas Registradas</h3>
            <span className="gp-badge-count">{preguntas.length}</span>
          </div>

          {loadingPreguntas ? (
            <div className="gp-state">
              <div className="gp-spinner" />
              <span>Cargando preguntas...</span>
            </div>
          ) : preguntas.length === 0 ? (
            <div className="gp-empty">
              <p>No hay preguntas registradas para esta materia.</p>
              <button className="gp-btn-primary" onClick={() => irA(VISTA.MODO)}>
                Agregar primera pregunta
              </button>
            </div>
          ) : (
            <div className="gp-list">
              {preguntas.map((p, i) => (
                <div key={p.id_pregunta} className="gp-item">
                  <div className="gp-item-num">{i + 1}</div>
                  <div className="gp-item-body">
                    <p className="gp-item-enunciado">{p.enunciado}</p>
                    <div className="gp-item-meta">
                      {renderTipoBadge(p.tipo_pregunta)}
                      <span
                        className={`gp-estado-badge ${p.activo ? "gp-estado-badge--activo" : "gp-estado-badge--inactivo"}`}
                      >
                        {p.activo ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </div>
                  <div className="gp-item-actions">
                    <button className="gp-btn-edit" onClick={() => abrirEditar(p)}>
                      <PenLine size={13} /> Editar
                    </button>
                    {p.activo ? (
                      <button
                        className="gp-btn-toggle-off"
                        onClick={() => handleDesactivar(p)}
                      >
                        <PowerOff size={13} /> Desactivar
                      </button>
                    ) : (
                      <button
                        className="gp-btn-toggle-on"
                        onClick={() => handleActivar(p)}
                      >
                        <Power size={13} /> Activar
                      </button>
                    )}
                    <button
                      className="gp-btn-delete"
                      onClick={() => handleEliminarFisico(p)}
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {materiaSeleccionada && vista === VISTA.MODO && (
        <div className="gp-page">
          <div className="gp-page-header">
            <h3>Agregar Preguntas</h3>
          </div>
          <div className="gp-modo-grid">
            <div className="gp-modo-card" onClick={() => irA(VISTA.TIPO)}>
              <div className="gp-modo-icon gp-modo-blue">
                <PenLine size={28} />
              </div>
              <h4>Agregar Manualmente</h4>
              <p>Formularios por tipo con validación estricta.</p>
            </div>

            <div className="gp-modo-card gp-modo-card--maint" onClick={() => irA(VISTA.EXCEL)}>
              <div className="gp-modo-icon gp-modo-green">
                <TableProperties size={28} />
              </div>
              <h4>Carga de Archivo Excel</h4>
              <p>Flujo legacy intacto para MULTIPLE y V/F.</p>
            </div>
          </div>
          <div className="gp-page-footer">
            <button className="gp-btn-secondary" onClick={volverALista}>
              <ChevronLeft size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {materiaSeleccionada && vista === VISTA.EXCEL && (
        <CargaExcel
          idMateria={materiaSeleccionada.id_materia}
          nombreMateria={materiaSeleccionada.nombre}
          onVolver={() => irA(VISTA.MODO)}
          onExito={() => {
            cargarPreguntas(materiaSeleccionada.id_materia);
            toast("Preguntas cargadas desde Excel.");
          }}
        />
      )}

      {materiaSeleccionada && vista === VISTA.TIPO && (
        <div className="gp-page">
          <div className="gp-page-header">
            <h3>Crear Nueva Pregunta</h3>
            <p>Selecciona el tipo de pregunta</p>
          </div>
          <div className="gp-tipo-grid">
            {TIPOS.map((tipo) => {
              const Icon = tipo.icon;
              return (
                <div key={tipo.key} className="gp-tipo-card" onClick={() => seleccionarTipo(tipo.key)}>
                  <div className="gp-tipo-icon">
                    <Icon size={26} />
                  </div>
                  <h4>{tipo.label}</h4>
                  <p>{tipo.hint}</p>
                </div>
              );
            })}
          </div>
          <div className="gp-page-footer">
            <button className="gp-btn-secondary" onClick={() => irA(VISTA.MODO)}>
              <ChevronLeft size={15} /> Volver
            </button>
          </div>
        </div>
      )}

      {materiaSeleccionada && vista === VISTA.CONFIG && (
        <div className="gp-page gp-page--form">
          <div className="gp-page-header">
            <h3>Configurar Cuestionario</h3>
            <p>{materiaSeleccionada.nombre}</p>
          </div>
          <div className="gp-form-card">
            <div className="gp-form-group">
              <label className="gp-label">Tipo de Cuestionario</label>
              <div className="gp-cfg-modo-row">
                {["TEST", "EXAMEN"].map((m) => (
                  <div
                    key={m}
                    className={`gp-cfg-modo-card${cfgModo === m ? " gp-cfg-modo-card--active" : ""}`}
                    onClick={() => {
                      const ex = configuraciones.find((c) => c.modo === m);
                      setCfgModo(m);
                      setCfgTiempo(ex?.tiempo_limite_min ? String(ex.tiempo_limite_min) : "");
                      setCfgIntentos(
                        m === "EXAMEN"
                          ? ex?.intentos_permitidos === null ||
                            ex?.intentos_permitidos === undefined
                            ? ""
                            : String(ex.intentos_permitidos)
                          : "",
                      );
                    }}
                  >
                    {cfgModo === m ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    <div>
                      <div className="gp-cfg-modo-name">{m}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="gp-form-group">
              <label className="gp-label">Tiempo límite (min)</label>
              <input
                className="gp-input"
                type="number"
                min="1"
                value={cfgTiempo}
                onChange={(e) => setCfgTiempo(e.target.value)}
              />
            </div>
            {cfgModo === "EXAMEN" && (
              <div className="gp-form-group">
                <label className="gp-label">Intentos permitidos</label>
                <input
                  className="gp-input"
                  type="number"
                  min="1"
                  placeholder="Vacío = infinito"
                  value={cfgIntentos}
                  onChange={(e) => setCfgIntentos(e.target.value)}
                />
              </div>
            )}

            {configuraciones.length > 0 && (
              <div className="gp-form-group">
                <label className="gp-label">Configuraciones actuales</label>
                <div className="gp-cfg-list">
                  {configuraciones.map((cfg) => (
                    <div key={cfg.id_config} className="gp-cfg-row">
                      <span className={`gp-cfg-tag gp-cfg-tag--${cfg.modo.toLowerCase()}`}>
                        {cfg.modo}
                      </span>
                      <span className="gp-cfg-info">
                        {cfg.tiempo_limite_min ? `${cfg.tiempo_limite_min} min` : "Sin límite"} ·{" "}
                        {cfg.modo === "TEST"
                          ? "Intentos infinitos"
                          : cfg.intentos_permitidos === null
                            ? "Intentos infinitos"
                            : `${cfg.intentos_permitidos} intento${cfg.intentos_permitidos !== 1 ? "s" : ""}`}
                      </span>
                      <button
                        className="gp-btn-delete"
                        onClick={() => handleEliminarConfig(cfg)}
                        disabled={eliminandoCfg === cfg.id_config}
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cfgErrForm && (
              <div className="gp-form-error">
                <AlertCircle size={15} /> {cfgErrForm}
              </div>
            )}
          </div>
          <div className="gp-page-footer">
            <button className="gp-btn-secondary" onClick={volverALista}>
              Cancelar
            </button>
            <button className="gp-btn-primary" onClick={handleGuardarConfig} disabled={cfgGuardando}>
              {cfgGuardando ? "Guardando..." : `Guardar configuración ${cfgModo}`}
            </button>
          </div>
        </div>
      )}

      {materiaSeleccionada && vista === VISTA.FORM && (
        <div className="gp-page gp-page--form">
          <div className="gp-page-header">
            <h3>{editando ? "Editar Pregunta" : "Crear Nueva Pregunta"}</h3>
            <p>{materiaSeleccionada.nombre}</p>
          </div>

          <div className="gp-form-card">
            {!editando && (
              <button className="gp-back-link" onClick={() => irA(VISTA.TIPO)}>
                <ChevronLeft size={15} /> Cambiar tipo de pregunta
              </button>
            )}

            <div className="gp-form-tipo-badge">
              {tipoMeta && TipoFormIcon && (
                <>
                  <TipoFormIcon size={13} /> {tipoMeta.label}
                </>
              )}
            </div>

            <div className="gp-form-group">
              <label className="gp-label">Enunciado</label>
              <textarea
                className="gp-textarea"
                rows={4}
                value={enunciado}
                onChange={(e) => setEnunciado(e.target.value)}
              />
            </div>

            <div className="gp-form-group">
              <label className="gp-label">URL de imagen (opcional)</label>
              <input
                className="gp-input"
                value={urlImagen}
                onChange={(e) => setUrlImagen(e.target.value)}
              />
            </div>

            {renderSubform()}

            {tipoPregunta === "COMPLETAR" && (
              <div className="gp-form-group">
                <label className="gp-label">Preview runtime</label>
                <div className="gp-hint">Esta vista reutiliza el mismo renderer de Test/Exam.</div>
                <div style={{ marginTop: 8 }}>
                  <CompletarRenderer
                    estructura={{
                      tipo: "COMPLETAR",
                      modo_interaccion: resolveCompletarInteractionMode(
                        estructuraForm.modo_interaccion,
                      ).resolved,
                      texto: estructuraForm.texto || "",
                      espacios: (estructuraForm.espacios || []).map((esp, idx) => ({
                        espacio_id: esp.espacio_id || `B${idx + 1}`,
                        posicion: idx + 1,
                      })),
                      opciones_arrastrar: (estructuraForm.opciones_arrastrar || [])
                        .map((f, idx) => ({
                          ficha_id: f.ficha_id || `F${idx + 1}`,
                          texto: String(f.texto || "").trim(),
                        }))
                        .filter((f) => f.texto),
                    }}
                    respuestaMap={previewCompletar}
                    onChangeMap={(nextMap) => setPreviewCompletar(nextMap)}
                  />
                </div>
                <div className="gp-hint" style={{ marginTop: 8 }}>
                  Payload preview: {JSON.stringify({
                    respuesta_json: serializeCompletarState(
                      previewCompletar,
                      parseCompletarText(estructuraForm.texto || "").slotIds,
                      resolveCompletarMode({
                        modo_interaccion: estructuraForm.modo_interaccion,
                      }),
                    ),
                  })}
                </div>
              </div>
            )}

            <div className="gp-form-group">
              <label className="gp-label">Explicación (opcional)</label>
              <textarea
                className="gp-textarea"
                rows={2}
                value={estructuraForm.explicacion || ""}
                onChange={(e) =>
                  setEstructuraForm((prev) => ({ ...prev, explicacion: e.target.value }))
                }
              />
            </div>

            {errForm && (
              <div className="gp-form-error">
                <AlertCircle size={15} /> {errForm}
              </div>
            )}
          </div>

          <div className="gp-page-footer">
            <button className="gp-btn-secondary" onClick={volverALista}>
              Cancelar
            </button>
            <button className="gp-btn-primary" onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : editando ? "Guardar Cambios" : "Crear Pregunta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
