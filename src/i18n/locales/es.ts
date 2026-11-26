import type { Locale } from '../types.js';
import type { Messages } from './en.js';

const messages: Messages = {
  'lang.choose': '¿Qué idioma quieres usar?',
  'lang.button': 'Idioma: {name}',
  'lang.selected': 'elegido',
  'lang.row': 'Idioma',

  'btn.close': 'Cerrar',
  'btn.more': 'Más',
  'btn.share': 'Compartir',
  'btn.newDrawing': 'Dibujo nuevo',
  'btn.run': 'Ejecutar',

  'mode.title': '¿Quién programa hoy?',
  'mode.subtitle': 'Elige uno. Puedes cambiar cuando quieras.',
  'mode.little': 'Tortuguitas',
  'mode.coder': 'Tortugas Programadoras',
  'mode.age.little': 'Menos de 8',
  'mode.age.coder': 'De 8 a 12',
  'mode.blurb.little': 'Junta bloques de colores, o solo di qué dibujar.',
  'mode.blurb.coder': 'Escribe código de verdad y luego míralo en Python y JavaScript.',
  'mode.tag.blocks': 'Bloques',
  'mode.tag.talk': 'Habla con la tortuga',
  'mode.tag.picture': 'Retos con dibujos',
  'mode.tag.logo': 'Logo',
  'mode.tag.python': 'Python',
  'mode.tag.javascript': 'JavaScript',
  'mode.tag.coding': 'Retos de código',
  'mode.art.forward': 'avanza 50',
  'mode.art.right': 'gira a la derecha',
  'mode.art.repeat': 'repite 4',
  'mode.privacy': 'Privacidad para padres',

  'more.switchMode': 'Cambiar de modo ({mode})',

  'keys.toolbar': 'Teclas de comandos Logo',
  'keys.type': 'Escribir {label}: {hint}',
  'keys.runAria': 'Ejecutar el programa',
  'keys.hint.forward': 'avanzar',
  'keys.hint.back': 'retroceder',
  'keys.hint.right': 'girar a la derecha',
  'keys.hint.left': 'girar a la izquierda',
  'keys.hint.repeat': 'repetir los comandos entre corchetes',
  'keys.hint.brackets': 'corchetes',
  'keys.hint.digit': 'dígito {d}',
  'keys.hint.number': 'un número',
  'keys.hint.penup': 'subir el lápiz',
  'keys.hint.pendown': 'bajar el lápiz',
  'keys.hint.run': 'ejecutar el programa',

  'shelf.groups': 'Grupos de comandos',
  'shelf.insert': 'Insertar {code}: {hint}',
  'shelf.insertColour': 'Insertar el color de lápiz {name}',
  'shelf.group.move': 'Mover',
  'shelf.group.turn': 'Girar',
  'shelf.group.pen': 'Lápiz',
  'shelf.group.magic': 'Magia',
  'shelf.group.music': 'Música',
  'shelf.group.movie': 'Película',
  'shelf.group.game': 'Juego',
  'shelf.group.colours': 'Colores',
  'shelf.hint.forward': 'Camina 50 pasos hacia delante',
  'shelf.hint.back': 'Camina 50 pasos hacia atrás',
  'shelf.hint.right': 'Gira a la derecha un cuarto de vuelta',
  'shelf.hint.left': 'Gira a la izquierda un cuarto de vuelta',
  'shelf.hint.penup': 'Lápiz arriba: moverse sin dibujar',
  'shelf.hint.pendown': 'Lápiz abajo: volver a dibujar',
  'shelf.hint.size': 'Hacer la línea más gruesa',
  'shelf.hint.repeat': 'Haz 4 veces los comandos entre [ ]',
  'shelf.hint.circle': 'Dibuja un círculo alrededor de la tortuga',
  'shelf.hint.play3': 'Toca tres notas, una tras otra',
  'shelf.hint.playLong': 'Toca notas; el 2 hace que la última dure el doble',
  'shelf.hint.tempo': 'Toca las notas más despacio (un número mayor es más rápido)',
  'shelf.hint.frame': 'Muestra este dibujo y lo mantiene un momento',
  'shelf.hint.wait': 'Espera medio segundo (60 es un segundo)',
  'shelf.hint.clean': 'Borra el dibujo para empezar el siguiente',
  'shelf.hint.when': 'Haz los comandos entre [ ] cuando se pulsa la flecha hacia arriba',

  'privacy.lang':
    'El idioma que elige un niño (English, Naijá Pidgin, Français o Español) se guarda en el navegador (la clave se llama gio.lang). GIO nunca lo guarda en su servidor. Se envía con cada petición al ayudante tortuga y al servidor solo como cabecera de la petición, para que las respuestas lleguen en ese idioma. Borrar los datos del sitio en el navegador lo elimina.',
};

/**
 * Palabras Logo en español. Las oficiales vienen del Logo en español (AVANZA/AV, RETROCEDE/RE,
 * DERECHA, IZQUIERDA, SUBELAPIZ, BAJALAPIZ, REPITE, BORRAPANTALLA). Donde no hay palabra establecida
 * son « ours »: elegidas por nosotros, simples, en ASCII y sin tildes.
 */
const words = {
  FORWARD: ['AVANZA', 'AV'],
  BACK: ['RETROCEDE', 'RE'],
  RIGHT: ['DERECHA', 'DE'],
  LEFT: ['IZQUIERDA', 'IZ'],
  PENUP: ['SUBELAPIZ', 'SL'],
  PENDOWN: ['BAJALAPIZ', 'BL'],
  HOME: ['CENTRO'],
  CLEARSCREEN: ['BORRAPANTALLA', 'BP'],
  CLEAN: ['LIMPIA'], // ours
  SETPENCOLOR: ['PONCOLOR'], // ours
  SETPENSIZE: ['PONGROSOR'], // ours
  SETBACKGROUND: ['PONFONDO'], // ours
  SETHEADING: ['PONRUMBO'],
  SETXY: ['PONPOS'],
  SETX: ['PONX'],
  SETY: ['PONY'],
  ARC: ['ARCO'], // ours
  CIRCLE: ['CIRCULO'], // ours
  HIDETURTLE: ['OCULTATORTUGA', 'OT'],
  SHOWTURTLE: ['MUESTRATORTUGA', 'MT'],
  PRINT: ['ESCRIBE'],
  DOT: ['PUNTO'], // ours
  SHOW: ['MUESTRA'], // ours
  GAMEOVER: ['FINJUEGO'], // ours
  PLAY: ['TOCA'], // ours
  SETTEMPO: ['TEMPO'], // ours
  WAIT: ['ESPERA'], // ours
  FRAME: ['CUADRO'], // ours
  RANDOM: ['AZAR'],
  REPCOUNT: ['CUENTA'], // ours
  SQRT: ['RAIZ'],
  SIN: ['SENO'],
  COS: ['COSENO'],
  HEADING: ['RUMBO'],
  XCOR: ['POSX'],
  YCOR: ['POSY'],
  DISTANCE: ['DISTANCIA'], // ours
  SENTENCE: ['FRASE'],
  TO: ['PARA'],
  END: ['FIN'],
  REPEAT: ['REPITE'],
  IF: ['SI'],
  IFELSE: ['SISINO'],
  MAKE: ['HAZ'],
  STOP: ['ALTO'],
  WHEN: ['CUANDO'], // ours
} as const;

export const es: Locale = { lang: 'es', messages, words };
