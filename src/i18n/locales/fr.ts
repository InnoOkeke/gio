import type { Locale } from '../types.js';
import type { Messages } from './en.js';

const messages: Messages = {
  'lang.choose': 'Quelle langue veux-tu utiliser ?',
  'lang.button': 'Langue : {name}',
  'lang.selected': 'choisie',
  'lang.row': 'Langue',

  'btn.close': 'Fermer',
  'btn.more': 'Plus',
  'btn.share': 'Partager',
  'btn.newDrawing': 'Nouveau dessin',
  'btn.run': 'Lancer',

  'mode.title': 'Qui programme aujourd’hui ?',
  'mode.subtitle': 'Choisis. Tu pourras changer quand tu veux.',
  'mode.little': 'Petites Tortues',
  'mode.coder': 'Tortues Codeuses',
  'mode.age.little': 'Moins de 8 ans',
  'mode.age.coder': '8 à 12 ans',
  'mode.blurb.little': 'Assemble des blocs colorés, ou dis simplement quoi dessiner.',
  'mode.blurb.coder': 'Écris du vrai code, puis vois-le en Python et en JavaScript.',
  'mode.tag.blocks': 'Blocs',
  'mode.tag.talk': 'Parler à la tortue',
  'mode.tag.picture': 'Défis en images',
  'mode.tag.logo': 'Logo',
  'mode.tag.python': 'Python',
  'mode.tag.javascript': 'JavaScript',
  'mode.tag.coding': 'Défis de code',
  'mode.art.forward': 'avance 50',
  'mode.art.right': 'tourne à droite',
  'mode.art.repeat': 'répète 4',
  'mode.privacy': 'Confidentialité pour les parents',

  'more.switchMode': 'Changer de mode ({mode})',

  'keys.toolbar': 'Touches de commandes Logo',
  'keys.type': 'Écrire {label} : {hint}',
  'keys.runAria': 'Lancer le programme',
  'keys.hint.forward': 'avancer',
  'keys.hint.back': 'reculer',
  'keys.hint.right': 'tourner à droite',
  'keys.hint.left': 'tourner à gauche',
  'keys.hint.repeat': 'répéter les commandes entre les crochets',
  'keys.hint.brackets': 'crochets',
  'keys.hint.digit': 'chiffre {d}',
  'keys.hint.number': 'un nombre',
  'keys.hint.penup': 'lever le crayon',
  'keys.hint.pendown': 'baisser le crayon',
  'keys.hint.run': 'lancer le programme',

  'shelf.groups': 'Groupes de commandes',
  'shelf.insert': 'Insérer {code} : {hint}',
  'shelf.insertColour': 'Insérer la couleur de crayon {name}',
  'shelf.group.move': 'Avancer',
  'shelf.group.turn': 'Tourner',
  'shelf.group.pen': 'Crayon',
  'shelf.group.magic': 'Magie',
  'shelf.group.music': 'Musique',
  'shelf.group.movie': 'Film',
  'shelf.group.game': 'Jeu',
  'shelf.group.colours': 'Couleurs',
  'shelf.hint.forward': 'Avance de 50 pas',
  'shelf.hint.back': 'Recule de 50 pas',
  'shelf.hint.right': 'Tourne à droite d’un quart de tour',
  'shelf.hint.left': 'Tourne à gauche d’un quart de tour',
  'shelf.hint.penup': 'Crayon levé : bouger sans dessiner',
  'shelf.hint.pendown': 'Crayon baissé : dessiner de nouveau',
  'shelf.hint.size': 'Rendre le trait plus épais',
  'shelf.hint.repeat': 'Fais 4 fois les commandes entre [ ]',
  'shelf.hint.circle': 'Dessine un cercle autour de la tortue',
  'shelf.hint.play3': 'Joue trois notes, l’une après l’autre',
  'shelf.hint.playLong': 'Joue des notes ; le 2 rend la dernière deux fois plus longue',
  'shelf.hint.tempo': 'Joue les notes plus lentement (un nombre plus grand va plus vite)',
  'shelf.hint.frame': 'Montre cette image, puis la garde un instant',
  'shelf.hint.wait': 'Attends une demi-seconde (60 font une seconde)',
  'shelf.hint.clean': 'Efface l’image pour commencer la suivante',
  'shelf.hint.when': 'Fais les commandes entre [ ] quand on appuie sur la flèche du haut',

  'privacy.lang':
    'La langue choisie par un enfant (English, Naijá Pidgin, Français ou Español) est gardée dans le navigateur (la clé s’appelle gio.lang). GIO ne l’enregistre jamais sur son serveur. Elle est envoyée avec chaque demande à l’assistant tortue et au serveur uniquement sous forme d’en-tête de requête, pour que les réponses arrivent dans cette langue. Effacer les données du site dans le navigateur la supprime.',
};

/**
 * Mots Logo français. Les mots officiels viennent du Logo français (AVANCE/AV, RECULE/RE, DROITE/TD,
 * GAUCHE/TG, LEVELECRAYON/LC, BAISSELECRAYON/BC, REPETE, EFFACEECRAN/VE). Ceux qui n'ont pas de mot
 * établi sont « ours » : choisis par nous, simples, en ASCII et sans accent.
 */
const words = {
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
} as const;

export const fr: Locale = { lang: 'fr', messages, words };
