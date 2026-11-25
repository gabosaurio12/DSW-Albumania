const API_BASE = 'https://www.theaudiodb.com/api/v1/json/123';

export const SEMILLA = Object.freeze([
  Object.freeze({ artista: 'Coldplay', titulo: 'Yellow' }),
  Object.freeze({ artista: 'Adele', titulo: 'Hello' }),
  Object.freeze({ artista: 'Queen', titulo: 'Bohemian Rhapsody' }),
  Object.freeze({ artista: 'The Beatles', titulo: 'Hey Jude' }),
  Object.freeze({ artista: 'Dua Lipa', titulo: 'Levitating' })
]);

export const ALBUMES_POR_ARTISTA = Object.freeze({
  111239: Object.freeze(['Parachutes', 'A Rush of Blood to the Head', 'X&Y']),
  111493: Object.freeze(['19', '21', '25']),
  111238: Object.freeze(['A Night at the Opera', 'News of the World', 'Greatest Hits I & II']),
  111247: Object.freeze(['Abbey Road', 'Let It Be', 'Past Masters, Volume Two']),
  143553: Object.freeze(['Dua Lipa', 'Future Nostalgia', 'Radical Optimism'])
});

function clave(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function claveSemilla(semilla) {
  return `${clave(semilla.artista)}|${clave(semilla.titulo)}`;
}

async function consultar(ruta) {
  const respuesta = await fetch(`${API_BASE}/${ruta}`);

  if (respuesta.status === 429) {
    throw new Error('Límite de peticiones de TheAudioDB alcanzado');
  }
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al consultar TheAudioDB`);
  }

  return respuesta.json();
}

function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

export function esTrackValido(track) {
  return track !== null
    && typeof track === 'object'
    && textoValido(track.idTrack)
    && textoValido(track.titulo)
    && textoValido(track.artista)
    && textoValido(track.album)
    && textoValido(track.genero);
}

function datosTrackValidos(item) {
  return textoValido(item.strTrack)
    && textoValido(item.strArtist)
    && textoValido(item.strAlbum)
    && textoValido(item.strGenre);
}

function urlSegura(valor) {
  if (!textoValido(valor)) {
    return '';
  }
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function mapearTrack(item) {
  return Object.freeze({
    idTrack: String(item.idTrack ?? ''),
    titulo: item.strTrack.trim(),
    artista: item.strArtist.trim(),
    idArtista: String(item.idArtist ?? ''),
    album: item.strAlbum.trim(),
    idAlbum: String(item.idAlbum ?? ''),
    genero: item.strGenre.trim(),
    portada: urlSegura(item.strTrackThumb)
  });
}

function coincideConSemilla(item, semilla) {
  return clave(String(item.strTrack ?? '')) === clave(semilla.titulo)
    && clave(String(item.strArtist ?? '')) === clave(semilla.artista);
}

async function obtenerTrack(semilla) {
  const parametros = new URLSearchParams({ s: semilla.artista, t: semilla.titulo });
  const datos = await consultar(`searchtrack.php?${parametros}`);
  const candidatos = Array.isArray(datos.track) ? datos.track : [];
  const elegido = candidatos.find((item) => coincideConSemilla(item, semilla));

  if (elegido === undefined || !datosTrackValidos(elegido)) {
    throw new Error('El track no tiene álbum o género');
  }

  const track = mapearTrack(elegido);
  if (!esTrackValido(track)) {
    throw new Error('El track no pasó la validación');
  }
  return track;
}

/**
 * Consulta en paralelo solo los tracks pendientes.
 * @returns {Promise<{tracks: Array, faltantes: Array}>}
 */
export async function cargarTracks(faltantes = SEMILLA) {
  const resultados = await Promise.allSettled(faltantes.map((semilla) => obtenerTrack(semilla)));

  return resultados.reduce((acumulado, resultado, indice) => {
    if (resultado.status === 'fulfilled') {
      return { ...acumulado, tracks: [...acumulado.tracks, resultado.value] };
    }
    return { ...acumulado, faltantes: [...acumulado.faltantes, faltantes[indice]] };
  }, { tracks: [], faltantes: [] });
}

export async function cargarTop10(artista) {
  const parametros = new URLSearchParams({ s: artista });
  const datos = await consultar(`track-top10.php?${parametros}`);
  const candidatos = Array.isArray(datos.track) ? datos.track : [];
  const elegido = candidatos.find(datosTrackValidos);

  if (elegido === undefined) {
    throw new Error('El artista no tiene canciones disponibles');
  }

  const track = mapearTrack(elegido);
  if (!esTrackValido(track)) {
    throw new Error('El track no pasó la validación');
  }
  return track;
}

/**
 * Detalles breves del artista para la vista de álbumes.
 * @returns {Promise<Object>}
 */
export async function cargarArtista(idArtista) {
  const parametros = new URLSearchParams({ i: idArtista });
  const datos = await consultar(`artist.php?${parametros}`);
  const candidatos = Array.isArray(datos.artists) ? datos.artists : [];
  const elegido = candidatos.find((item) => String(item.idArtist ?? '') === String(idArtista));

  if (elegido === undefined || !textoValido(elegido.strArtist)) {
    throw new Error('El artista no está disponible');
  }

  return Object.freeze({
    idArtista: String(elegido.idArtist ?? ''),
    nombre: elegido.strArtist.trim(),
    imagen: urlSegura(elegido.strArtistThumb),
    genero: textoValido(elegido.strGenre) ? elegido.strGenre.trim() : '',
    estilo: textoValido(elegido.strStyle) ? elegido.strStyle.trim() : '',
    pais: textoValido(elegido.strCountry) ? elegido.strCountry.trim() : '',
    formacion: textoValido(elegido.intFormedYear) ? elegido.intFormedYear.trim() : '',
    biografia: textoValido(elegido.strBiography) ? elegido.strBiography.trim() : ''
  });
}

function coincideAlbum(item, artista, titulo) {
  return clave(String(item.strArtist ?? '')) === clave(artista)
    && clave(String(item.strAlbum ?? '')) === clave(titulo);
}

function mapearAlbum(item) {
  return Object.freeze({
    idAlbum: String(item.idAlbum ?? ''),
    idArtista: String(item.idArtist ?? ''),
    artista: textoValido(item.strArtist) ? item.strArtist.trim() : '',
    titulo: item.strAlbum.trim(),
    anio: textoValido(item.intYearReleased) ? item.intYearReleased.trim() : '',
    genero: textoValido(item.strGenre) ? item.strGenre.trim() : '',
    sello: textoValido(item.strLabel) ? item.strLabel.trim() : '',
    portada: urlSegura(item.strAlbumThumb)
  });
}

function albumValido(album) {
  return textoValido(album.titulo) && textoValido(album.idAlbum);
}

async function obtenerAlbum(artista, titulo) {
  const parametros = new URLSearchParams({ s: artista, a: titulo });
  const datos = await consultar(`searchalbum.php?${parametros}`);
  const candidatos = Array.isArray(datos.album) ? datos.album : [];
  const elegido = candidatos.find((item) => coincideAlbum(item, artista, titulo));

  if (elegido === undefined || !textoValido(elegido.strAlbum)) {
    throw new Error('El álbum no está disponible');
  }

  const album = mapearAlbum(elegido);
  if (!albumValido(album)) {
    throw new Error('El álbum no tiene identificador');
  }
  return album;
}

/**
 * Álbumes curados de la semilla. Si uno falla, se omite sin afectar a los demás.
 * @returns {Promise<Array>}
 */
export async function cargarAlbumes(artista, titulos) {
  const resultados = await Promise.allSettled(titulos.map((titulo) => obtenerAlbum(artista, titulo)));

  return resultados
    .filter((resultado) => resultado.status === 'fulfilled')
    .map((resultado) => resultado.value);
}

/**
 * Detalle del álbum en su propia página.
 * @returns {Promise<Object>}
 */
export async function cargarAlbum(idAlbum) {
  const parametros = new URLSearchParams({ m: idAlbum });
  const datos = await consultar(`album.php?${parametros}`);
  const candidatos = Array.isArray(datos.album) ? datos.album : [];
  const elegido = candidatos.find((item) => String(item.idAlbum ?? '') === String(idAlbum));

  if (elegido === undefined || !textoValido(elegido.strAlbum)) {
    throw new Error('El álbum no está disponible');
  }

  const album = mapearAlbum(elegido);
  if (!albumValido(album)) {
    throw new Error('El álbum no tiene identificador');
  }
  return album;
}

function mapearCancion(item) {
  return Object.freeze({
    titulo: textoValido(item.strTrack) ? item.strTrack.trim() : '',
    numero: textoValido(item.intTrackNumber) ? item.intTrackNumber.trim() : '',
    duracion: textoValido(item.intDuration) ? item.intDuration.trim() : ''
  });
}

/**
 * Canciones disponibles con la clave gratuita (una por álbum en v1).
 * @returns {Promise<Array>}
 */
export async function cargarCancionesAlbum(idAlbum) {
  const parametros = new URLSearchParams({ m: idAlbum });
  const datos = await consultar(`track.php?${parametros}`);
  const candidatos = Array.isArray(datos.track) ? datos.track : [];

  return candidatos
    .map(mapearCancion)
    .filter((cancion) => cancion.titulo !== '');
}
