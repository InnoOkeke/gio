/**
 * Logo command words of the three languages other than English, kept apart from the message files so the Logo reader can know every
 * language's words without loading all of their text. Each locale file imports its own table from here.
 */
import type { WordTable } from './types.js';

/**
 * Mots Logo français. Les mots officiels viennent du Logo français (AVANCE/AV, RECULE/RE, DROITE/TD,
 * GAUCHE/TG, LEVELECRAYON/LC, BAISSELECRAYON/BC, REPETE, EFFACEECRAN/VE). Ceux qui n'ont pas de mot
 * établi sont « ours » : choisis par nous, simples, en ASCII et sans accent.
 */
export const frWords = {
  FORWARD: ['AVANCE', 'AV'],
  BACK: ['RECULE', 'RE'],
  RIGHT: ['DROITE', 'TD'],
  LEFT: ['GAUCHE', 'TG'],
  PENUP: ['LEVELECRAYON', 'LC'],
  PENDOWN: ['BAISSELECRAYON', 'BC'],
  HOME: ['ORIGINE'],
  CLEARSCREEN: ['EFFACEECRAN', 'VE'],
  CLEAN: ['NETTOIE'], // ours
  SETPENCOLOR: ['FIXECOULEUR'], // ours
  SETPENSIZE: ['FIXEEPAISSEUR'], // ours
  SETBACKGROUND: ['FIXEFOND'], // ours
  SETHEADING: ['FIXECAP'],
  SETXY: ['FIXEXY'],
  SETX: ['FIXEX'],
  SETY: ['FIXEY'],
  ARC: ['ARC'], // ours
  CIRCLE: ['CERCLE'], // ours
  HIDETURTLE: ['CACHETORTUE', 'CT'],
  SHOWTURTLE: ['MONTRETORTUE', 'MT'],
  PRINT: ['ECRIS'],
  DOT: ['POINT'], // ours
  SHOW: ['AFFICHE'], // ours
  GAMEOVER: ['FINDUJEU'], // ours
  PLAY: ['JOUE'], // ours
  SETTEMPO: ['TEMPO'], // ours
  WAIT: ['ATTENDS'], // ours
  FRAME: ['IMAGE'], // ours
  FILL: ['REMPLIS'], // ours
  RANDOM: ['HASARD'],
  REPCOUNT: ['COMPTEUR'], // ours
  SQRT: ['RACINE'],
  SIN: ['SINUS'],
  COS: ['COSINUS'],
  HEADING: ['CAP'],
  XCOR: ['ABSCISSE'],
  YCOR: ['ORDONNEE'],
  DISTANCE: ['DISTANCE'], // ours
  SENTENCE: ['PHRASE'],
  TO: ['POUR'],
  END: ['FIN'],
  REPEAT: ['REPETE'],
  IF: ['SI'],
  IFELSE: ['SISINON'],
  MAKE: ['DONNE'],
  STOP: ['ARRETE'],
  WHEN: ['QUAND'], // ours
} as const satisfies WordTable;

/**
 * Palabras Logo en español. Las oficiales vienen del Logo en español (AVANZA/AV, RETROCEDE/RE,
 * DERECHA, IZQUIERDA, SUBELAPIZ, BAJALAPIZ, REPITE, BORRAPANTALLA). Donde no hay palabra establecida
 * son « ours »: elegidas por nosotros, simples, en ASCII y sin tildes.
 */
export const esWords = {
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
  FILL: ['RELLENA'], // ours
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
} as const satisfies WordTable;

export const pcmWords = {
  FORWARD: ['GO', 'FD'],
  BACK: ['COMEBACK', 'BK'],
  RIGHT: ['RIGHT', 'RT'],
  LEFT: ['LEFT', 'LT'],
  PENUP: ['LIFTPEN', 'PU'],
  PENDOWN: ['DROPPEN', 'PD'],
  CLEARSCREEN: ['WIPE', 'CS'],
  CLEAN: ['SWEEP'],
  SETPENCOLOR: ['PENCOLOUR'],
  SETPENSIZE: ['PENFAT'],
  SETBACKGROUND: ['BACKCOLOUR'],
  SETHEADING: ['FACE'],
  SETXY: ['JUMPXY'],
  SETX: ['JUMPX'],
  SETY: ['JUMPY'],
  HIDETURTLE: ['HIDEMAN'],
  SHOWTURTLE: ['SHOWMAN'],
  PRINT: ['WRITE'],
  GAMEOVER: ['GAMEDONE'],
  PLAY: ['SING'],
  WAIT: ['HOLD'],
  FRAME: ['SNAP'],
  RANDOM: ['ANYHOW'],
  REPCOUNT: ['WHICHROUND'],
  HEADING: ['WHERETOFACE'],
  SENTENCE: ['JOIN'],
  TO: ['TEACH'],
  END: ['FINISH'],
  REPEAT: ['DOAGAIN'],
  MAKE: ['KEEP'],
} as const satisfies WordTable;
