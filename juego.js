import { SEMILLA, claveSemilla, cargarArtista, cargarTop10, cargarTracks } from './api.js';
import {
  leerTracks,
  guardarTracks,
  leerPartida,
  guardarPartida,
  leerRacha,
  guardarRacha
} from './storage.js';

const MAX_INTENTOS = 8;
const UMBRALES_PISTAS = [2, 4, 6];
const PISTAS = Object.freeze({
  2: (track) => `Género: ${track.genero}`,
  4: (track) => `Álbum: ${track.album}`,
  6: (track) => `Artista: ${track.artista}`
});

let tracks = [];
let trackOculto = null;
let partida = null;
let racha = { valor: 0, mejor: 0 };
let longitudRespuesta = 0;
let elementos = {};
let casillasActivas = [];
let enfocarCasilla = false;
let fotoArtistaSolicitada = '';
const CARACTERES_PERMITIDOS = /^[a-z0-9]$/i;

function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function crearCasillaEstatica(letra, estado) {
  const casilla = document.createElement('span');
  casilla.className = 'casilla';
  casilla.setAttribute('aria-hidden', 'true');
  casilla.textContent = letra;

  if (estado === 'correcto' || estado === 'presente') {
    casilla.classList.add(`casilla--${estado}`);
  }
  return casilla;
}

function crearCasillaEditable(indice) {
  const casilla = document.createElement('input');
  casilla.className = 'casilla casilla--editable';
  casilla.type = 'text';
  casilla.maxLength = 1;
  casilla.autocomplete = 'off';
  casilla.spellcheck = false;
  casilla.setAttribute('aria-label', `Letra ${indice + 1} de ${longitudRespuesta}`);
  casilla.setAttribute('form', 'formulario');

  casilla.addEventListener('input', () => {
    const permitidos = casilla.value
      .split('')
      .filter((caracter) => CARACTERES_PERMITIDOS.test(caracter));
    casilla.value = permitidos[0] ?? '';

    if (casilla.value !== '' && indice < casillasActivas.length - 1) {
      casillasActivas[indice + 1].focus();
    }
  });

  casilla.addEventListener('keydown', (evento) => {
    if (evento.key === 'Backspace' && casilla.value === '' && indice > 0) {
      evento.preventDefault();
      const anterior = casillasActivas[indice - 1];
      anterior.value = '';
      anterior.focus();
    } else if (evento.key === 'ArrowLeft' && indice > 0) {
      evento.preventDefault();
      casillasActivas[indice - 1].focus();
    } else if (evento.key === 'ArrowRight' && indice < casillasActivas.length - 1) {
      evento.preventDefault();
      casillasActivas[indice + 1].focus();
    }
  });

  return casilla;
}

function compararIntento(intento, respuesta) {
  const resultado = Array(respuesta.length).fill('ausente');
  const restantes = new Map();

  for (let indice = 0; indice < respuesta.length; indice += 1) {
    if (intento[indice] === respuesta[indice]) {
      resultado[indice] = 'correcto';
    } else {
      restantes.set(respuesta[indice], (restantes.get(respuesta[indice]) ?? 0) + 1);
    }
  }

  for (let indice = 0; indice < intento.length; indice += 1) {
    if (resultado[indice] === 'correcto') {
      continue;
    }
    const disponibles = restantes.get(intento[indice]) ?? 0;
    if (disponibles > 0) {
      resultado[indice] = 'presente';
      restantes.set(intento[indice], disponibles - 1);
    }
  }

  return resultado;
}

function obtenerFaltantes(tracksGuardados) {
  const guardadas = new Set(
    tracksGuardados.map((track) => claveSemilla({ artista: track.artista, titulo: track.titulo }))
  );
  return SEMILLA.filter((semilla) => !guardadas.has(claveSemilla(semilla)));
}

function fusionarTracks(actuales, nuevos) {
  const porId = new Map(actuales.map((track) => [track.idTrack, track]));
  nuevos.forEach((track) => porId.set(track.idTrack, track));
  return [...porId.values()].slice(0, SEMILLA.length);
}

function cargarElementos() {
  elementos = {
    tablero: document.getElementById('tablero'),
    formulario: document.getElementById('formulario'),
    contador: document.getElementById('contador'),
    mensaje: document.getElementById('mensaje'),
    rachaValor: document.getElementById('racha-valor'),
    rachaMejor: document.getElementById('racha-mejor'),
    resultado: document.getElementById('resultado'),
    resultadoTarjeta: document.getElementById('resultado-artista'),
    resultadoTitulo: document.getElementById('resultado-titulo'),
    resultadoDetalle: document.getElementById('resultado-detalle'),
    resultadoPortada: document.getElementById('resultado-portada'),
    resultadoArtistaImagen: document.getElementById('resultado-artista-imagen'),
    resultadoArtistaNombre: document.getElementById('resultado-artista-nombre'),
    nuevaPartida: document.getElementById('nueva-partida'),
    errorCarga: document.getElementById('error-carga'),
    reintentar: document.getElementById('reintentar'),
    listaPistas: document.getElementById('lista-pistas')
  };
}

async function prepararTracks() {
  const faltantes = obtenerFaltantes(tracks);
  if (faltantes.length === 0) {
    return;
  }

  elementos.mensaje.textContent = 'Cargando canciones…';
  try {
    const resultado = await cargarTracks(faltantes);
    tracks = fusionarTracks(tracks, resultado.tracks);
    guardarTracks(tracks);

    if (resultado.faltantes.length > 0) {
      elementos.mensaje.textContent = `Faltan ${resultado.faltantes.length} canción(es). Se reintentará al recargar.`;
    } else {
      elementos.mensaje.textContent = '';
    }
  } catch {
    elementos.mensaje.textContent = 'No se pudieron cargar las canciones. Inténtalo de nuevo.';
  }
}

function crearPartida() {
  const candidatos = tracks.length > 1 && partida !== null
    ? tracks.filter((track) => track.idTrack !== partida.idTrack)
    : tracks;
  const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];

  return {
    idTrack: elegido.idTrack,
    intentos: [],
    errores: 0,
    pistasMostradas: 0,
    estado: 'jugando'
  };
}

function retirarTrackJugado() {
  if (trackOculto === null) {
    return null;
  }

  const retirado = trackOculto;
  tracks = tracks.filter((track) => track.idTrack !== retirado.idTrack);
  guardarTracks(tracks);
  return retirado;
}

function esRepuestoValido(candidato, retirado, guardados) {
  return candidato.idTrack !== retirado.idTrack
    && claveSemilla(candidato) !== claveSemilla(retirado)
    && !guardados.some((track) => track.idTrack === candidato.idTrack
      || claveSemilla(track) === claveSemilla(candidato));
}

async function renovarCache(trackRetirado) {
  if (trackRetirado === null) {
    return;
  }

  const artistas = [...new Set([trackRetirado.artista, ...tracks.map((track) => track.artista)])];
  let repuesto = null;

  for (const artista of artistas) {
    try {
      const candidato = await cargarTop10(artista);
      if (esRepuestoValido(candidato, trackRetirado, tracks)) {
        repuesto = candidato;
        break;
      }
    } catch {
      continue;
    }
  }

  tracks = fusionarTracks(tracks, repuesto === null ? [trackRetirado] : [repuesto]);
  guardarTracks(tracks);
}

function comenzarPartida() {
  fotoArtistaSolicitada = '';
  const guardada = leerPartida();
  const esRecuperable = guardada !== null
    && tracks.some((track) => track.idTrack === guardada.idTrack);

  partida = esRecuperable ? guardada : crearPartida();
  trackOculto = tracks.find((track) => track.idTrack === partida.idTrack);
  longitudRespuesta = normalizar(trackOculto.titulo).length;
  guardarPartida(partida);

  elementos.errorCarga.hidden = true;
  renderTodo();
}

function renderMarcador() {
  elementos.rachaValor.textContent = String(racha.valor);
  elementos.rachaMejor.textContent = String(racha.mejor);
}

function renderTablero() {
  elementos.tablero.style.setProperty('--columnas', String(longitudRespuesta));
  const fragmento = document.createDocumentFragment();
  const filaActiva = partida.estado === 'jugando' ? partida.intentos.length : -1;
  const activas = [];

  for (let fila = 0; fila < MAX_INTENTOS; fila += 1) {
    const filaElemento = document.createElement('div');
    filaElemento.className = 'fila';
    filaElemento.setAttribute('role', 'group');
    filaElemento.setAttribute('aria-label', `Intento ${fila + 1} de ${MAX_INTENTOS}`);

    if (fila === filaActiva) {
      filaElemento.classList.add('fila--activa');
    }

    const intento = partida.intentos[fila];
    for (let columna = 0; columna < longitudRespuesta; columna += 1) {
      let casilla;
      if (intento !== undefined) {
        casilla = crearCasillaEstatica(intento.texto[columna] ?? '', intento.resultado[columna]);
      } else if (fila === filaActiva) {
        casilla = crearCasillaEditable(columna);
        activas.push(casilla);
      } else {
        casilla = crearCasillaEstatica('', null);
      }
      filaElemento.appendChild(casilla);
    }
    fragmento.appendChild(filaElemento);
  }

  casillasActivas = activas;
  elementos.tablero.replaceChildren(fragmento);
}

function leerIntentoActivo() {
  return casillasActivas.map((casilla) => casilla.value).join('');
}

function renderPistas() {
  const fragmento = document.createDocumentFragment();
  const visibles = UMBRALES_PISTAS.slice(0, partida.pistasMostradas);

  if (visibles.length === 0) {
    const pendiente = document.createElement('li');
    pendiente.className = 'pista pista--pendiente';
    pendiente.textContent = 'Dos fallos y aparecerá la primera pista.';
    fragmento.appendChild(pendiente);
  } else {
    visibles.forEach((umbral) => {
      const pista = document.createElement('li');
      pista.className = 'pista';

      const numero = document.createElement('span');
      numero.className = 'pista__numero';
      numero.textContent = String(umbral);

      const texto = document.createElement('span');
      texto.className = 'pista__texto';
      texto.textContent = PISTAS[umbral](trackOculto);

      pista.append(numero, texto);
      fragmento.appendChild(pista);
    });
  }

  elementos.listaPistas.replaceChildren(fragmento);
}

async function cargarFotoArtista(idArtista, idTrack, nombreArtista) {
  if (fotoArtistaSolicitada === idArtista) {
    return;
  }
  fotoArtistaSolicitada = idArtista;

  if (idArtista === '') {
    return;
  }

  try {
    const artista = await cargarArtista(idArtista);
    if (partida === null || partida.idTrack !== idTrack || partida.estado === 'jugando') {
      return;
    }
    if (artista.imagen === '') {
      return;
    }
    elementos.resultadoArtistaImagen.src = artista.imagen;
    elementos.resultadoArtistaImagen.alt = `Foto de ${nombreArtista}`;
    elementos.resultadoArtistaImagen.hidden = false;
  } catch {
    // El enlace de texto sigue disponible aunque falle la foto.
  }
}

function renderResultado() {
  const terminada = partida.estado !== 'jugando';
  elementos.resultado.hidden = !terminada;
  elementos.nuevaPartida.hidden = !terminada;
  if (!terminada) {
    return;
  }

  const acierto = partida.estado === 'ganada';
  elementos.resultadoTitulo.textContent = acierto
    ? '¡Acertaste!'
    : 'Se acabaron los intentos';
  elementos.resultadoDetalle.textContent = `La canción era «${trackOculto.titulo}», de ${trackOculto.artista}. Álbum: ${trackOculto.album}. Género: ${trackOculto.genero}.`;

  if (trackOculto.portada) {
    elementos.resultadoPortada.src = trackOculto.portada;
    elementos.resultadoPortada.alt = `Carátula de ${trackOculto.titulo}`;
    elementos.resultadoPortada.hidden = false;
  } else {
    elementos.resultadoPortada.removeAttribute('src');
    elementos.resultadoPortada.alt = '';
    elementos.resultadoPortada.hidden = true;
  }

  elementos.resultadoTarjeta.href = `artista.html?id=${encodeURIComponent(trackOculto.idArtista)}`;
  elementos.resultadoTarjeta.setAttribute('aria-label', `Ver álbumes de ${trackOculto.artista}`);
  elementos.resultadoArtistaNombre.textContent = `Ver álbumes de ${trackOculto.artista}`;
  elementos.resultadoArtistaImagen.removeAttribute('src');
  elementos.resultadoArtistaImagen.alt = '';
  elementos.resultadoArtistaImagen.hidden = true;
  cargarFotoArtista(trackOculto.idArtista, partida.idTrack, trackOculto.artista);
}

function renderTodo() {
  renderMarcador();
  renderTablero();
  renderPistas();
  renderResultado();

  elementos.contador.textContent = partida.estado === 'jugando'
    ? `Intento ${partida.intentos.length + 1} de ${MAX_INTENTOS}`
    : `Partida ${partida.estado}`;
  elementos.formulario.hidden = partida.estado !== 'jugando';

  if (enfocarCasilla && casillasActivas.length > 0) {
    casillasActivas[0].focus();
  }
  enfocarCasilla = false;
}

function describirResultado(intento, resultado) {
  return intento
    .split('')
    .map((letra, indice) => `${letra} (${resultado[indice]})`)
    .join(', ');
}

function procesarIntento(texto) {
  const letras = normalizar(texto);

  if (letras.length !== longitudRespuesta) {
    elementos.mensaje.textContent = `Completa las ${longitudRespuesta} casillas antes de adivinar.`;
    return;
  }

  const resultado = compararIntento(letras, normalizar(trackOculto.titulo));
  const acierto = resultado.every((estado) => estado === 'correcto');
  const errores = partida.errores + (acierto ? 0 : 1);
  const pistasMostradas = UMBRALES_PISTAS.includes(errores)
    ? partida.pistasMostradas + 1
    : partida.pistasMostradas;
  const estado = acierto ? 'ganada' : (errores >= MAX_INTENTOS ? 'perdida' : 'jugando');

  partida = {
    ...partida,
    intentos: [...partida.intentos, { texto: letras, resultado }],
    errores,
    pistasMostradas,
    estado
  };

  if (estado === 'ganada') {
    const nuevoValor = racha.valor + 1;
    racha = { valor: nuevoValor, mejor: Math.max(racha.mejor, nuevoValor) };
    guardarRacha(racha);
  } else if (estado === 'perdida') {
    racha = { ...racha, valor: 0 };
    guardarRacha(racha);
  }

  guardarPartida(partida);
  enfocarCasilla = true;
  renderTodo();

  if (acierto) {
    elementos.mensaje.textContent = 'Has descubierto la canción.';
  } else if (estado === 'perdida') {
    elementos.mensaje.textContent = `La respuesta era ${trackOculto.titulo}.`;
  } else {
    elementos.mensaje.textContent = `Intento ${partida.intentos.length}: ${describirResultado(letras, resultado)}`;
  }
}

function adjuntarEventos() {
  elementos.formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (partida === null || partida.estado !== 'jugando') {
      return;
    }
    procesarIntento(leerIntentoActivo());
  });

  elementos.nuevaPartida.addEventListener('click', () => {
    const trackRetirado = retirarTrackJugado();
    partida = crearPartida();
    guardarPartida(partida);
    elementos.mensaje.textContent = '';
    enfocarCasilla = true;
    comenzarPartida();
    renovarCache(trackRetirado);
  });

  elementos.reintentar.addEventListener('click', async () => {
    elementos.reintentar.disabled = true;
    await prepararTracks();
    elementos.reintentar.disabled = false;

    if (tracks.length > 0) {
      enfocarCasilla = true;
      comenzarPartida();
    } else {
      elementos.mensaje.textContent = 'Sigue sin ser posible cargar las canciones.';
    }
  });
}

function mostrarErrorCarga() {
  elementos.formulario.hidden = true;
  elementos.resultado.hidden = true;
  elementos.nuevaPartida.hidden = true;
  elementos.errorCarga.hidden = false;
  elementos.mensaje.textContent = '';
}

async function iniciar() {
  cargarElementos();
  adjuntarEventos();

  racha = leerRacha();
  tracks = leerTracks();
  await prepararTracks();

  if (tracks.length === 0) {
    mostrarErrorCarga();
    return;
  }

  comenzarPartida();
}

iniciar();
