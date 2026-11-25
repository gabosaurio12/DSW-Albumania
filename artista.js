/**
 * Vista del artista: datos breves, biografía y álbumes de la semilla.
 */

import { ALBUMES_POR_ARTISTA, cargarAlbumes, cargarArtista } from './api.js';
import { leerTracks } from './storage.js';

let idArtista = '';
const elementos = {};

function cargarElementos() {
  Object.assign(elementos, {
    nombre: document.getElementById('artista-nombre'),
    imagen: document.getElementById('artista-imagen'),
    datos: document.getElementById('artista-datos'),
    biografia: document.getElementById('artista-biografia'),
    lista: document.getElementById('lista-albumes'),
    artistaSeccion: document.getElementById('artista-seccion'),
    albumesSeccion: document.getElementById('albumes-seccion'),
    error: document.getElementById('error-artista'),
    errorMensaje: document.getElementById('error-artista-mensaje'),
    reintentar: document.getElementById('reintentar-artista')
  });
}

function crearAlbum(album) {
  const item = document.createElement('li');
  item.className = 'album';

  const enlace = document.createElement('a');
  enlace.className = 'album__enlace';
  enlace.href = `album.html?id=${encodeURIComponent(album.idAlbum)}`;
  enlace.setAttribute('aria-label', `Ver canciones de ${album.titulo}`);

  const arte = document.createElement('div');
  arte.className = 'album__arte';
  const disco = document.createElement('div');
  disco.className = 'album__disco';
  disco.setAttribute('aria-hidden', 'true');

  const portada = document.createElement('img');
  portada.className = 'album__portada';
  portada.loading = 'lazy';
  if (album.portada) {
    portada.src = album.portada;
    portada.alt = `Carátula de ${album.titulo}`;
  } else {
    portada.removeAttribute('src');
    portada.alt = '';
    portada.hidden = true;
  }
  arte.append(disco, portada);

  const info = document.createElement('div');
  info.className = 'album__info';

  const titulo = document.createElement('h3');
  titulo.className = 'album__titulo';
  titulo.textContent = album.titulo;

  const detalle = document.createElement('p');
  detalle.className = 'album__detalle';
  const partes = [
    album.anio && `Año: ${album.anio}`,
    album.genero && `Género: ${album.genero}`,
    album.sello && `Sello: ${album.sello}`
  ].filter(Boolean);
  detalle.textContent = partes.join(' · ');

  const accion = document.createElement('span');
  accion.className = 'album__accion';
  accion.textContent = 'Ver canciones';

  info.append(titulo, detalle, accion);
  enlace.append(arte, info);
  item.appendChild(enlace);
  return item;
}

function renderAlbumes(albumes) {
  const fragmento = document.createDocumentFragment();

  if (albumes.length === 0) {
    const mensaje = document.createElement('li');
    mensaje.className = 'album album--vacio';
    mensaje.textContent = 'No hay álbumes disponibles en TheAudioDB.';
    fragmento.appendChild(mensaje);
  } else {
    albumes.forEach((album) => fragmento.appendChild(crearAlbum(album)));
  }

  elementos.lista.replaceChildren(fragmento);
}

function renderArtista(datos, nombreRespaldo) {
  const nombre = datos.nombre || nombreRespaldo;
  elementos.nombre.textContent = nombre;
  document.title = `${nombre} · Albumania`;

  if (datos.imagen) {
    elementos.imagen.src = datos.imagen;
    elementos.imagen.alt = `Foto de ${nombre}`;
    elementos.imagen.hidden = false;
  } else {
    elementos.imagen.removeAttribute('src');
    elementos.imagen.alt = '';
    elementos.imagen.hidden = true;
  }

  const partes = [
    datos.genero && `Género: ${datos.genero}`,
    datos.estilo && `Estilo: ${datos.estilo}`,
    datos.pais && `País: ${datos.pais}`,
    datos.formacion && `Desde: ${datos.formacion}`
  ].filter(Boolean);
  elementos.datos.textContent = partes.join(' · ');
  elementos.biografia.textContent = datos.biografia
    || 'TheAudioDB no tiene biografía de este artista.';
}

function mostrarError(mensaje, nombreRespaldo = '') {
  if (nombreRespaldo !== '') {
    elementos.nombre.textContent = nombreRespaldo;
    document.title = `${nombreRespaldo} · Albumania`;
  }

  elementos.artistaSeccion.hidden = true;
  elementos.albumesSeccion.hidden = true;
  elementos.errorMensaje.textContent = mensaje;
  elementos.error.hidden = false;
}

async function cargarTodo() {
  elementos.error.hidden = true;
  elementos.artistaSeccion.hidden = false;
  elementos.albumesSeccion.hidden = false;

  const track = leerTracks().find((item) => item.idArtista === idArtista);
  if (track === undefined) {
    mostrarError('Abre esta página desde la tarjeta de la respuesta del juego.', 'Artista no disponible');
    return;
  }

  elementos.nombre.textContent = track.artista;
  document.title = `${track.artista} · Albumania`;

  try {
    const datos = await cargarArtista(idArtista);
    renderArtista(datos, track.artista);
  } catch {
    mostrarError('No se pudieron cargar los datos del artista. Inténtalo de nuevo.', track.artista);
    return;
  }

  const titulos = ALBUMES_POR_ARTISTA[idArtista] ?? [];
  const albumes = await cargarAlbumes(track.artista, titulos);
  renderAlbumes(albumes);
}

function iniciar() {
  cargarElementos();
  idArtista = new URLSearchParams(window.location.search).get('id') ?? '';
  elementos.reintentar.addEventListener('click', cargarTodo);
  cargarTodo();
}

iniciar();
