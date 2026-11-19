import { test } from "node:test";
import assert from "node:assert/strict";
import { PersonajeService } from "../src/services/personaje.service.js";

test("monedas proporcionales al resultado", () => {
  const m = PersonajeService.monedasPorResultado;
  assert.equal(m(10, 10, 15), 15); // examen perfecto
  assert.equal(m(9, 10, 10), 9); // lección al 90%
  assert.equal(m(1, 3, 10), 3);
  assert.equal(m(0, 10, 10), 0);
  assert.equal(m(0, 0, 10), 0); // sin preguntas
});
