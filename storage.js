/**
 * Persistencia con Web Storage API.
 * Todas las entradas se versionan para poder ignorar formatos antiguos sin migraciones.
 */

import { esTrackValido } from './api.js';

const VERSION = 1;
const CLAVES = Object.freeze({
  tracks: `albumania.tracks.v${VERSION}`,
  partida: `albumania.partida.v${VERSION}`,
  racha: `albumania.racha.v${VERSION}`
});

const ESTADOS = new Set(['jugando', 'ganada', 'perdida']);
const RESULTADOS = new Set(['correcto', 'presente', 'ausente']);

function leer(clave, esValido, valorPorDefecto) {
  try {
    const guardado = window.localStorage.getItem(clave);
    if (guardado === null) {
      return valorPorDefecto;
    }
    const datos = JSON.parse(guardado);
    return esValido(datos) ? datos : valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

function escribir(clave, valor) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function esEnvoltorioValido(datos, validarContenido) {
  return datos !== null
    && typeof datos === 'object'
    && datos.version === VERSION
    && validarContenido(datos);
}

function esTracksValido(datos) {
  return esEnvoltorioValido(
    datos,
    (valor) => Array.isArray(valor.tracks) && valor.tracks.every(esTrackValido)
  );
}

export function leerTracks() {
  return leer(CLAVES.tracks, esTracksValido, { version: VERSION, tracks: [] }).tracks;
}

export function guardarTracks(tracks) {
  return escribir(CLAVES.tracks, { version: VERSION, tracks });
}

function esPartidaValido(datos) {
  return esEnvoltorioValido(datos, (valor) => typeof valor.idTrack === 'string'
    && valor.idTrack.length > 0
    && Array.isArray(valor.intentos)
    && valor.intentos.every((intento) => typeof intento.texto === 'string'
      && Array.isArray(intento.resultado)
      && intento.resultado.every((estado) => RESULTADOS.has(estado)))
    && Number.isInteger(valor.errores)
    && valor.errores >= 0
    && Number.isInteger(valor.pistasMostradas)
    && valor.pistasMostradas >= 0
    && ESTADOS.has(valor.estado));
}

export function leerPartida() {
  const datos = leer(CLAVES.partida, esPartidaValido, null);
  if (datos === null) {
    return null;
  }
  return {
    idTrack: datos.idTrack,
    intentos: datos.intentos,
    errores: datos.errores,
    pistasMostradas: datos.pistasMostradas,
    estado: datos.estado
  };
}

export function guardarPartida(partida) {
  return escribir(CLAVES.partida, { version: VERSION, ...partida });
}

function esRachaValido(datos) {
  return esEnvoltorioValido(datos, (valor) => Number.isInteger(valor.valor)
    && valor.valor >= 0
    && Number.isInteger(valor.mejor)
    && valor.mejor >= 0);
}

export function leerRacha() {
  const datos = leer(CLAVES.racha, esRachaValido, null);
  return datos === null ? { valor: 0, mejor: 0 } : { valor: datos.valor, mejor: datos.mejor };
}

export function guardarRacha(racha) {
  return escribir(CLAVES.racha, {
    version: VERSION,
    valor: racha.valor,
    mejor: racha.mejor
  });
}
