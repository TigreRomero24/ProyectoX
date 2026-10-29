import assert from "node:assert";
import { estructuraPublica } from "../src/utils/estructuraPublica.js";
import { xmlSeguro } from "../src/utils/securityLogger.js";
const ord = estructuraPublica("ORDENAR", { opciones: ["a","b","c"], respuesta: { orden_ids: ["A","B","C"] } });
assert.equal(ord.respuesta, undefined);
assert.deepEqual(ord.opciones.map(o=>o.id).sort(), ["A","B","C"]);
assert.equal(ord.opciones.find(o=>o.id==="B").texto, "b");
const comp = estructuraPublica("COMPLETAR", { texto: "x [[1]]", espacios: [{ espacio_id: "0", label: "1", respuestas: ["si"] }], respuesta: { aceptadas: [] } });
assert.equal(comp.respuesta, undefined);
assert.equal(comp.espacios[0].respuestas, undefined);
assert.equal(comp.espacios[0].label, "1");
assert.equal(estructuraPublica("MULTIPLE", null), null);
assert.equal(xmlSeguro("</securityLogs><x>&"), "&lt;/securityLogs&gt;&lt;x&gt;&amp;");

