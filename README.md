# Albumania

![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-orange)
![API](https://img.shields.io/badge/TheAudioDB-v1-blue)
![Dependencias](https://img.shields.io/badge/dependencies-none-brightgreen)

Juego tipo Wordle en el que la respuesta oculta es un **track de TheAudioDB**. Al terminar una ronda se muestra una tarjeta mínima del track que abre la vista del artista con sus álbumes en vertical, con estética de LP clásico; cada álbum abre su propia página con la canción disponible.

## Qué hace el proyecto

- Adivina el título de una canción en **ocho intentos**, escribiendo una letra por casilla.
- Compara sin acentos ni mayúsculas: cada letra se marca como correcta, presente o ausente.
- Muestra pistas automáticas en el 2º error (género), 4º (álbum) y 6º (artista); en el 8º revela la respuesta.
- Persiste la racha y la partida en `localStorage` para continuar tras recargar.
- Al acabar, enlaza con una vista del artista (foto, datos, biografía y tres álbumes curados) y desde ahí con el detalle del álbum.
- Al pulsar «Nueva partida» retira la canción anterior del caché en memoria y consulta una diferente mediante `track-top10.php?s=artista`.

## Por qué es útil

- **Cero instalación:** no hay `package.json`, build, bundler ni dependencias.
- **Datos reales:** usa la API v1 de TheAudioDB con la clave gratuita `123`.
- **Caché mínima:** precarga cinco tracks, reutiliza la caché válida y reintenta solo los que faltaron.
- **Honesto con los límites gratuitos:** la clave devuelve una sola canción por álbum y una por artista en el top 10; la app no inventa listas ni usa la API premium.
- **Interfaz accesible:** tablero siempre visible, entrada directa con `Enter` o botón, estados aria y diseño responsive.
- **Aprendizaje práctico:** muestra módulos ES, Web Storage API, manejo de errores y renderizado seguro con `textContent`.

## Cómo empezar

### Requisitos

- Navegador moderno con soporte para módulos ES.
- Python 3 o cualquier servidor estático.
- Conexión a internet para consultar TheAudioDB.

### Ejecutar en local

```bash
cd src
python3 -m http.server 8000
```

Abre <http://localhost:8000/index.html>. No hay nada que instalar.

> Los módulos ES no funcionan con `file://`; sirve siempre `src/` con un servidor HTTP.

### Ejemplo de uso de la API

Desde la terminal:

```bash
curl "https://www.theaudiodb.com/api/v1/json/123/searchtrack.php?s=Coldplay&t=Yellow"
```

Desde la consola del navegador, con el servidor activo y estando en `src/`:

```js
import('./api.js').then(async ({ SEMILLA, cargarTop10 }) => {
  console.table(SEMILLA);
  console.log(await cargarTop10('Coldplay'));
});
```

### Cómo se juega

1. Escribe una letra por casilla en la fila activa; los acentos y la puntuación se normalizan.
2. Envía con **Enter** en una casilla o con **Adivinar**.
3. Observa los colores y las pistas del panel lateral.
4. Abre la tarjeta de respuesta para ver al artista, pulsa un LP y consulta su canción.
5. Pulsa **Nueva partida** para renovar el track y seguir jugando.

## Estructura del proyecto

Todo el código de la aplicación vive en `src/`:

| Archivo | Función |
|---|---|
| [`index.html`](src/index.html) | Página principal del juego. |
| [`juego.js`](src/juego.js) | Tablero, intentos, pistas, racha y renovación de canciones. |
| [`api.js`](src/api.js) | Acceso a TheAudioDB y mapeo de tracks, artistas, álbumes y canciones. |
| [`storage.js`](src/storage.js) | Persistencia con Web Storage API. |
| [`artista.html`](src/artista.html) / [`artista.js`](src/artista.js) | Vista del artista con biografía y tres álbumes. |
| [`album.html`](src/album.html) / [`album.js`](src/album.js) | Vista del álbum con carátula y canción disponible. |
| [`styles.css`](src/styles.css) | Diseño de sala de conciertos, pentagrama y estética de LP. |

La persistencia usa solo tres claves versionadas: `albumania.tracks.v1`, `albumania.partida.v1` y `albumania.racha.v1`.

- Esquema de `localStorage`:
  - `albumania.tracks.v1` = `{ version: 1, tracks: [{ idTrack, titulo, artista, idArtista, album, idAlbum, genero, portada }] }`
  - `albumania.partida.v1` = `{ version: 1, idTrack, intentos: [{ texto, resultado: [] }], errores, pistasMostradas, estado }`
  - `albumania.racha.v1` = `{ version: 1, valor, mejor }`

## Dónde obtener ayuda

- Documentación oficial de TheAudioDB: <https://www.theaudiodb.com/free_music_api> y <https://www.theaudiodb.com/docs_json>.

## Mantenimiento y contribuciones

Mantenido por **Gabriel Antonio González López**, autor del entregable incluido en `src/` (`Actividad15GonzálezLópezGabriel.zip`).