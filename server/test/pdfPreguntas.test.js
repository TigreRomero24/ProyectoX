import assert from "node:assert";
import { test } from "node:test";

process.env.GEMINI_API_KEY ||= "clave-de-prueba";
const { PdfPreguntasService } = await import("../src/services/pdfPreguntas.service.js");

test("normaliza la salida de la IA al formato de la plantilla", async () => {
  const salidaIA = {
    preguntas: [
      { enunciado: " ¿2+2? ", tipo: "MULTIPLE", opcion_a: "3", opcion_b: "4", correcta: "B", sin_clave: false },
      { enunciado: "El sol es una estrella", tipo: "VF", opcion_a: "Verdadero", opcion_b: "Falso", correcta: "Z", sin_clave: false },
      { enunciado: "", tipo: "MULTIPLE", opcion_a: "x", opcion_b: "y", correcta: "A", sin_clave: false },
      { enunciado: "¿Primos?", tipo: "SM", opcion_a: "2", opcion_b: "3", opcion_c: "4", correcta: "b, a, b", sin_clave: false, tiene_imagen: true },
    ],
  };
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: "completed",
      steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(salidaIA) }] }],
    }),
  });

  const filas = await PdfPreguntasService.extraer(Buffer.from("%PDF-1.4"));
  assert.equal(filas.length, 3); // la de enunciado vacío se descarta
  assert.deepEqual(filas[0], {
    enunciado: "¿2+2?", tipo: "MULTIPLE", opcion_a: "3", opcion_b: "4",
    opcion_c: "", opcion_d: "", correcta: "B", sin_clave: false, imagen: "",
  });
  // letra inválida → sin respuesta y marcada para revisión
  assert.equal(filas[1].correcta, "");
  assert.equal(filas[1].sin_clave, true);
  // selección múltiple: letras únicas y ordenadas; la imagen se marca
  assert.equal(filas[2].correcta, "A,B");
  assert.equal(filas[2].imagen, "si");
});

test("si un modelo está saturado (503) usa el siguiente", async () => {
  const usados = [];
  globalThis.fetch = async (_url, opts) => {
    const { model } = JSON.parse(opts.body);
    usados.push(model);
    if (usados.length === 1) return { ok: false, status: 503, json: async () => ({ error: { message: "high demand" } }) };
    const salida = { preguntas: [{ enunciado: "¿Ok?", tipo: "VF", opcion_a: "Verdadero", opcion_b: "Falso", correcta: "A", sin_clave: false }] };
    return { ok: true, status: 200, json: async () => ({ steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(salida) }] }] }) };
  };
  const filas = await PdfPreguntasService.extraer(Buffer.from("%PDF-1.4"));
  assert.equal(usados.length, 2);
  assert.notEqual(usados[0], usados[1]);
  assert.equal(filas[0].correcta, "A");
});

test("si todos fallan, explica la causa", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(PdfPreguntasService.extraer(Buffer.from("%PDF-1.4")), /cuota gratuita/);
});
