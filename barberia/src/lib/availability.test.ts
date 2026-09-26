import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  availableSlots,
  busyFromBlocks,
  chooseBarber,
  weekdayOf,
} from "./availability.ts";

test("lunes de calendario se lee como lunes", () => {
  assert.equal(weekdayOf("2026-09-28"), "mon");
  assert.equal(addDays("2026-09-28", 1), "2026-09-29");
});

test("un día cerrado no ofrece horas", () => {
  assert.deepEqual(
    availableSlots({
      open: null,
      durationMin: 30,
      slotMinutes: 30,
      busy: [],
      closed: false,
      nowMinutes: null,
    }),
    [],
  );
});

test("oculta horas ocupadas, bloqueos y el tramo que no entra antes del cierre", () => {
  const slots = availableSlots({
    open: ["09:00", "12:00"],
    durationMin: 50,
    slotMinutes: 30,
    busy: [{ start: 9 * 60, end: 10 * 60 }],
    closed: false,
    nowMinutes: null,
  });
  assert.deepEqual(slots, ["10:00", "10:30", "11:00"]);
});

test("un bloqueo de día completo cierra la agenda", () => {
  const busy = busyFromBlocks(
    [{ fechaInicio: "2026-09-29", fechaFin: "2026-09-30", horaInicio: null, horaFin: null }],
    "2026-09-29",
  );
  assert.equal(busy.closed, true);
  assert.deepEqual(
    availableSlots({
      open: ["09:00", "12:00"],
      durationMin: 30,
      slotMinutes: 30,
      busy: busy.ranges,
      closed: busy.closed,
      nowMinutes: null,
    }),
    [],
  );
});

test("un bloqueo de horas solo tapa ese tramo", () => {
  const busy = busyFromBlocks(
    [{ fechaInicio: "2026-09-29", fechaFin: "2026-09-29", horaInicio: "14:00", horaFin: "16:00" }],
    "2026-09-29",
  );
  const slots = availableSlots({
    open: ["13:00", "17:00"],
    durationMin: 30,
    slotMinutes: 30,
    busy: busy.ranges,
    closed: busy.closed,
    nowMinutes: null,
  });
  assert.deepEqual(slots, ["13:00", "13:30", "16:00", "16:30"]);
});

test("hoy no muestra horas que ya pasaron", () => {
  const slots = availableSlots({
    open: ["09:00", "12:00"],
    durationMin: 30,
    slotMinutes: 30,
    busy: [],
    closed: false,
    nowMinutes: 10 * 60 + 10,
  });
  assert.equal(slots[0], "10:00");
});

test("elige al barbero con menos citas ese día", () => {
  const id = chooseBarber(
    [
      { id: "b", slots: ["10:00"], load: 3 },
      { id: "a", slots: ["10:00", "11:00"], load: 1 },
    ],
    "10:00",
  );
  assert.equal(id, "a");
});
