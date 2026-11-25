/**
 * Vista del álbum: detalle breve y canciones disponibles en TheAudioDB.
 */

import { cargarAlbum, cargarCancionesAlbum } from './api.js';

const MILISEGUNDOS_POR_SEGUNDO = 1000;
const SEGUNDOS_POR_MINUTO = 60;
const ID_VALIDO = /^\d+$/;

let idAlbum = '';
const elementos = {};

function cargarElementos() {
  Object.assign(elementos, {
    titulo: document.getElementById('album-titulo'),
    volver: document.getElementById('album-volver'),
    imagen: document.getElementById('album-imagen'),
    datos: document.getElementById('album-datos'),
    aviso: document.getElementById('album-aviso'),
    lista: document.getElementById('lista-canciones'),
    albumSeccion: document.getElementById('album-seccion'),
    cancionesSeccion: document.getElementById('canciones-seccion'),
    error: document.getElementById('error-album'),
    errorMensaje: document.getElementById('error-album-mensaje'),
    reintentar: document.getElementById('reintentar-album')
  });
}

function duracionLegible(valor) {
  if (!/^\d+$/.test(valor)) {
    return '';
  }

  const total = Math.round(Number(valor) / MILISEGUNDOS_POR_SEGUNDO);
  const minutos = Math.floor(total / SEGUNDOS_POR_MINUTO);
  const segundos = String(total % SEGUNDOS_POR_MINUTO).padStart(2, '0');
  return `${minutos}:${segundos}`;
}

function crearCancion(cancion) {
  const item = document.createElement('li');
  item.className = 'cancion';

  const numero = document.createElement('span');
  numero.className = 'cancion__numero';
  numero.textContent = cancion.numero || '·';

  const datos = document.createElement('div');
  datos.className = 'cancion__datos';

  const titulo = document.createElement('h3');
  titulo.className = 'cancion__titulo';
  titulo.textContent = cancion.titulo;

  const detalle = document.createElement('p');
  detalle.className = 'cancion__detalle';
  const duracion = duracionLegible(cancion.duracion);
  detalle.textContent = duracion === '' ? '' : `Duración: ${duracion}`;

  datos.append(titulo, detalle);
  item.append(numero, datos);
  return item;
}

function renderCanciones(canciones) {
  const fragmento = document.createDocumentFragment();

  if (canciones.length === 0) {
    const mensaje = document.createElement('li');
    mensaje.className = 'cancion cancion--vacia';
    mensaje.textContent = 'No hay canciones disponibles en TheAudioDB.';
    fragmento.appendChild(mensaje);
  } else {
    canciones.forEach((cancion) => fragmento.appendChild(crearCancion(cancion)));
  }

  elementos.lista.replaceChildren(fragmento);
}

function renderAlbum(album) {
  elementos.titulo.textContent = album.titulo;
  document.title = `${album.titulo} · Albumania`;

  if (album.idArtista !== '') {
    elementos.volver.href = `artista.html?id=${encodeURIComponent(album.idArtista)}`;
    elementos.volver.textContent = 'Volver al artista';
  } else {
    elementos.volver.href = 'index.html';
    elementos.volver.textContent = 'Volver al juego';
  }

  if (album.portada) {
    elementos.imagen.src = album.portada;
    elementos.imagen.alt = `Carátula de ${album.titulo}`;
    elementos.imagen.hidden = false;
  } else {
    elementos.imagen.removeAttribute('src');
    elementos.imagen.alt = '';
    elementos.imagen.hidden = true;
  }

  const partes = [
    album.artista && `Artista: ${album.artista}`,
    album.anio && `Año: ${album.anio}`,
    album.genero && `Género: ${album.genero}`,
    album.sello && `Sello: ${album.sello}`
  ].filter(Boolean);
  elementos.datos.textContent = partes.join(' · ');
}

function mostrarError(mensaje, tituloRespaldo = '') {
  if (tituloRespaldo !== '') {
    elementos.titulo.textContent = tituloRespaldo;
    document.title = `${tituloRespaldo} · Albumania`;
  }

  elementos.albumSeccion.hidden = true;
  elementos.cancionesSeccion.hidden = true;
  elementos.errorMensaje.textContent = mensaje;
  elementos.error.hidden = false;
}

async function cargarTodo() {
  elementos.error.hidden = true;
  elementos.albumSeccion.hidden = false;
  elementos.cancionesSeccion.hidden = false;
  elementos.aviso.textContent = '';

  if (!ID_VALIDO.test(idAlbum)) {
    mostrarError('Abre esta página desde un álbum de Albumania.', 'Álbum no disponible');
    return;
  }

  try {
    const album = await cargarAlbum(idAlbum);
    renderAlbum(album);

    const canciones = await cargarCancionesAlbum(idAlbum);
    renderCanciones(canciones);
    if (canciones.length === 1) {
      elementos.aviso.textContent = 'TheAudioDB, con la clave gratuita, solo expone una canción por álbum.';
    }
  } catch {
    mostrarError('No se pudo cargar el álbum. Inténtalo de nuevo.', 'Álbum');
  }
}

function iniciar() {
  cargarElementos();
  idAlbum = new URLSearchParams(window.location.search).get('id') ?? '';
  elementos.reintentar.addEventListener('click', cargarTodo);
  cargarTodo();
}

iniciar();
