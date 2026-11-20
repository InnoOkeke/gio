"""GIO's turtle for Python.

Real CPython's turtle needs a window (tkinter), which a browser does not have. This module has the same
names and does the same drawing maths, but instead of painting it writes down TurtleEvents (the same events
GIO's Logo interpreter makes) so GIO's own stage can play them. It is a real subset: what it cannot do
raises a plain Python error, it never pretends.

The turtle keeps its state in Logo's way (heading 0 is up, turning right adds). mode("standard") (Python's
default, east and counter-clockwise) is converted at the edge, in heading(), setheading() and towards().
"""
import math
import sys

__all__ = [
    "forward", "fd", "back", "bk", "backward", "right", "rt", "left", "lt", "goto", "setpos", "setposition",
    "setx", "sety", "setheading", "seth", "home", "circle", "dot", "penup", "pu", "up", "pendown", "pd", "down",
    "isdown", "pensize", "width", "pencolor", "color", "bgcolor", "hideturtle", "ht", "showturtle", "st",
    "isvisible", "xcor", "ycor", "pos", "position", "heading", "distance", "towards", "clear", "reset",
    "clearscreen", "write", "speed", "tracer", "update", "delay", "onkey", "onkeypress", "listen", "ontimer",
    "done", "mainloop", "exitonclick", "bye", "Screen", "Turtle", "Pen", "mode", "colormode", "TurtleGraphicsError",
    "begin_fill", "end_fill", "fillcolor", "filling", "shape", "shapesize", "stamp", "clearstamp", "clearstamps",
    "undo", "setundobuffer", "getscreen", "textinput", "numinput", "bgpic", "onclick", "onscreenclick", "onrelease",
    "ondrag", "setup", "title", "screensize", "window_width", "window_height", "tilt",
]

EVENT_CAP = 20000
MAX_SECONDS = 180
# Set by the host (boot.py) from GIO's own colour table, so there is one table for Logo and Python.
COLORS = {"black": "#1f2933", "white": "#ffffff"}
START_SIZE = 2


class TurtleGraphicsError(Exception):
    """A problem a child can read and fix."""


def _cant(name):
    return TurtleGraphicsError("GIO's turtle can't do %s yet." % name)


# ---- the event list the host collects -----------------------------------------------------------------------

_events = []
_seconds = [0.0]
_mode = ["standard"]
_tracer = [1]
_colormode = [1.0]
_bg = ["#ffffff"]
_stage = [None]  # the one turtle that draws on GIO's stage
_keys = {}  # GameKey name (UP, DOWN, ...) -> function
_timers = {}  # id -> (function, ms)
_next_timer = [1]

_KEY_NAMES = {"up": "UP", "down": "DOWN", "left": "LEFT", "right": "RIGHT", "space": "SPACE"}


def _begin_call():
    """The host calls this before every entry (run, key press, timer) so the limits count per call."""
    del _events[:]
    _seconds[0] = 0.0


def _take_events():
    out = list(_events)
    del _events[:]
    return out


def _round(n):
    if n != n or n in (math.inf, -math.inf):
        raise TurtleGraphicsError("That number is too big, or is not a number.")
    r = round(n * 1e6) / 1e6
    return 0.0 if r == 0 else r


def _line_number():
    f = sys._getframe(1)
    while f is not None:
        if f.f_code.co_filename == "<gio>":
            return f.f_lineno
        f = f.f_back
    return 0


class _State:
    def __init__(self):
        self.reset()

    def reset(self):
        self.x = 0.0
        self.y = 0.0
        self.heading = 90.0 if _mode[0] == "standard" else 0.0  # Logo convention, degrees clockwise from up
        self.pen_down = True
        self.color = COLORS.get("black", "#1f2933")
        self.size = START_SIZE
        self.visible = True

    def snapshot(self):
        return {
            "x": _round(self.x),
            "y": _round(self.y),
            "heading": _round(self.heading % 360),
            "penDown": self.pen_down,
            "color": self.color,
            "size": _round(self.size),
            "visible": self.visible,
        }


def _emit(kind, state, **fields):
    if len(_events) >= EVENT_CAP:
        raise TurtleGraphicsError("Your drawing has too many steps (more than %d). Try fewer repeats." % EVENT_CAP)
    event = {"type": kind, "line": _line_number(), "state": state.snapshot()}
    event.update(fields)
    _events.append(event)


def _stage_state():
    return _stage[0].s if _stage[0] is not None else _State()


def _add_seconds(seconds):
    _seconds[0] += seconds
    if _seconds[0] > MAX_SECONDS:
        raise TurtleGraphicsError("Your show is longer than 3 minutes, so I stopped it.")


def _emit_wait(seconds):
    """time.sleep(): never blocks, the stage waits instead."""
    if not isinstance(seconds, (int, float)) or isinstance(seconds, bool):
        raise TypeError("sleep needs a number of seconds")
    if seconds < 0:
        raise ValueError("sleep length must be non-negative")
    _add_seconds(seconds)
    _emit("wait", _stage_state(), seconds=_round(seconds))


def _emit_play(tones):
    _add_seconds(sum(t["seconds"] for t in tones))
    _emit("play", _stage_state(), tones=tones)


# ---- helpers -------------------------------------------------------------------------------------------------


def _num(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TurtleGraphicsError("%s needs a number, but got %r." % (name, value))
    return float(value)


def _xy(x, y, name):
    if y is None:
        if hasattr(x, "s"):
            return x.s.x, x.s.y
        try:
            x, y = x
        except (TypeError, ValueError):
            raise TurtleGraphicsError("%s needs two numbers, like %s(50, 50)." % (name, name)) from None
    return _num(x, name), _num(y, name)


def _hex(r, g, b):
    return "#%02x%02x%02x" % (r, g, b)


def _color(args, name):
    if len(args) == 1 and isinstance(args[0], (tuple, list)):
        args = tuple(args[0])
    if len(args) == 1 and isinstance(args[0], str):
        text = args[0].strip().lower()
        if text in COLORS:
            return COLORS[text]
        if len(text) == 7 and text[0] == "#":
            try:
                int(text[1:], 16)
                return text
            except ValueError:
                pass
        if len(text) == 4 and text[0] == "#":
            try:
                int(text[1:], 16)
                return "#" + "".join(c * 2 for c in text[1:])
            except ValueError:
                pass
        raise TurtleGraphicsError("I don't know the colour %r. Try a name like 'red' or a code like '#ff8800'." % args[0])
    if len(args) == 3 and all(isinstance(a, (int, float)) and not isinstance(a, bool) for a in args):
        top = _colormode[0]
        if any(a < 0 or a > top for a in args):
            raise TurtleGraphicsError("%s colour numbers go from 0 to %g." % (name, top))
        return _hex(*[int(round(a * 255 / top)) for a in args])
    raise TurtleGraphicsError("%s needs a colour name like 'red', a code like '#ff8800', or three numbers." % name)


def _heading_out(internal):
    return round((internal if _mode[0] == "logo" else 90 - internal) % 360, 10) % 360


def _heading_in(value):
    return (value if _mode[0] == "logo" else 90 - value) % 360


# ---- the turtle ----------------------------------------------------------------------------------------------


_made = []


class Turtle:
    def __init__(self, *args, _default=False, **kwargs):
        self.s = _State()
        self._default = _default
        _made.append(self)

    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        raise _cant(name)

    # Which turtle draws on the stage: the first one that draws, turns or moves in view. A turtle made with Turtle()
    # that only sets its pen, hides, or moves while hidden (like a scoreboard writer) stays quiet and never takes the stage.
    def _soft(self, kind):
        """Pen and look changes: shown if this turtle already owns the stage, silent for a turtle that has not drawn."""
        if self._default:
            self._show(kind)
        elif _stage[0] is self:
            _emit(kind, self.s)

    def _claim(self, drawing=False):
        """True when this turtle's events go to the stage. Raises when another turtle owns it and this one draws."""
        if _stage[0] is self:
            return True
        if _stage[0] is None:
            _stage[0] = self
            return True
        if drawing:
            raise TurtleGraphicsError("GIO's stage has one drawing turtle. The other turtle can write and stay hidden, but it can't draw or move in view yet.")
        return False

    def _show(self, kind, **fields):
        if self._claim():
            _emit(kind, self.s, **fields)

    # movement
    def _go_to(self, x, y):
        s = self.s
        drawing = s.pen_down
        if not drawing and not self._default and not s.visible:
            s.x, s.y = x, y
            return
        if not self._claim(drawing):
            s.x, s.y = x, y
            return
        x1, y1 = s.x, s.y
        s.x, s.y = _round(x), _round(y)
        if drawing:
            _emit("line", s, x1=_round(x1), y1=_round(y1), x2=s.x, y2=s.y, color=s.color, size=_round(s.size))
        else:
            _emit("move", s)

    def forward(self, distance):
        d = _num(distance, "forward")
        rad = math.radians(self.s.heading)
        self._go_to(self.s.x + d * math.sin(rad), self.s.y + d * math.cos(rad))

    def back(self, distance):
        self.forward(-_num(distance, "back"))

    def right(self, angle):
        self.s.heading = (self.s.heading + _num(angle, "right")) % 360
        self._show("turn")

    def left(self, angle):
        self.s.heading = (self.s.heading - _num(angle, "left")) % 360
        self._show("turn")

    def goto(self, x, y=None):
        px, py = _xy(x, y, "goto")
        self._go_to(px, py)

    def setx(self, x):
        self._go_to(_num(x, "setx"), self.s.y)

    def sety(self, y):
        self._go_to(self.s.x, _num(y, "sety"))

    def setheading(self, angle):
        self.s.heading = _heading_in(_num(angle, "setheading"))
        self._show("turn")

    def home(self):
        self._go_to(0.0, 0.0)
        self.s.heading = 90.0 if _mode[0] == "standard" else 0.0
        self._show("turn")

    def circle(self, radius, extent=None, steps=None):
        radius = _num(radius, "circle")
        extent = 360.0 if extent is None else _num(extent, "circle")
        if steps is None:
            frac = abs(extent) / 360.0
            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
        w = extent / steps
        w2 = 0.5 * w
        length = 2.0 * radius * math.sin(math.radians(w2))
        if radius < 0:
            length, w, w2 = -length, -w, -w2
        # CPython's own algorithm: a polygon with `steps` sides, turning left (counter-clockwise) for a positive radius.
        self.s.heading = (self.s.heading - w2) % 360
        for _ in range(steps):
            self.forward(length)
            self.s.heading = (self.s.heading - w) % 360
        self.s.heading = (self.s.heading + w2) % 360
        self._show("turn")

    def dot(self, size=None, *color):
        s = self.s
        if size is None:
            size = max(s.size + 4, 2 * s.size)
        elif isinstance(size, (str, tuple)):
            color = (size,) + color
            size = max(s.size + 4, 2 * s.size)
        diameter = _num(size, "dot")
        paint = _color(color, "dot") if color else s.color
        self._claim(True)
        _emit("dot", s, x=_round(s.x), y=_round(s.y), r=_round(max(diameter / 2.0, 1)), color=paint)

    # pen
    def penup(self):
        self.s.pen_down = False
        self._soft("pen")

    def pendown(self):
        self.s.pen_down = True
        self._soft("pen")

    def isdown(self):
        return self.s.pen_down

    def pensize(self, width=None):
        if width is None:
            return self.s.size
        w = _num(width, "pensize")
        if w <= 0 or w > 100:
            raise TurtleGraphicsError("Pen size should be between 1 and 100. You gave %s." % width)
        self.s.size = w
        self._soft("style")

    def pencolor(self, *args):
        if not args:
            return self.s.color
        self.s.color = _color(args, "pencolor")
        self._soft("style")

    def color(self, *args):
        if not args:
            return self.s.color
        if len(args) == 2:
            raise _cant("a fill colour")
        self.pencolor(*args)

    def hideturtle(self):
        self.s.visible = False
        self._soft("visibility")

    def showturtle(self):
        self.s.visible = True
        self._show("visibility")

    def isvisible(self):
        return self.s.visible

    # asking
    def xcor(self):
        return self.s.x

    def ycor(self):
        return self.s.y

    def position(self):
        return (self.s.x, self.s.y)

    def heading(self):
        return _heading_out(self.s.heading)

    def distance(self, x, y=None):
        px, py = _xy(x, y, "distance")
        return math.hypot(px - self.s.x, py - self.s.y)

    def towards(self, x, y=None):
        px, py = _xy(x, y, "towards")
        logo = math.degrees(math.atan2(px - self.s.x, py - self.s.y)) % 360
        return _heading_out(logo)

    # the page
    def clear(self):
        if _stage[0] is self:
            _emit("clear", self.s)

    def reset(self):
        self.s.reset()
        if _stage[0] is self:
            _emit("clear", self.s)

    def write(self, arg, move=False, align="left", font=None):
        _emit("show", _stage_state(), text=str(arg)[:200])

    def speed(self, speed=None):
        return 0 if speed is None else None

    def getscreen(self):
        return Screen()

    # the things GIO cannot do yet, named so the error is clear
    def _unsupported(name):
        def method(self, *args, **kwargs):
            raise _cant(name)

        method.__name__ = name
        return method

    begin_fill = _unsupported("begin_fill")
    end_fill = _unsupported("end_fill")
    fillcolor = _unsupported("fillcolor")
    filling = _unsupported("filling")
    shape = _unsupported("shape")
    shapesize = _unsupported("shapesize")
    stamp = _unsupported("stamp")
    clearstamp = _unsupported("clearstamp")
    clearstamps = _unsupported("clearstamps")
    undo = _unsupported("undo")
    tilt = _unsupported("tilt")

    fd = forward
    bk = back
    backward = back
    rt = right
    lt = left
    setpos = goto
    setposition = goto
    seth = setheading
    pu = penup
    up = penup
    pd = pendown
    down = pendown
    width = pensize
    ht = hideturtle
    st = showturtle
    pos = position

    del _unsupported


Pen = Turtle
_default = Turtle(_default=True)


class _Screen:
    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        raise _cant(name)

    def bgcolor(self, *args):
        return bgcolor(*args)

    def mode(self, m=None):
        return mode(m)

    def tracer(self, n=None, d=None):
        return tracer(n, d)

    def update(self):
        update()

    def delay(self, d=None):
        return delay(d)

    def onkey(self, fn, key):
        onkey(fn, key)

    onkeypress = onkey

    def listen(self, *args):
        pass

    def ontimer(self, fn, t=0):
        ontimer(fn, t)

    def mainloop(self):
        pass

    done = mainloop

    def exitonclick(self):
        pass

    def bye(self):
        pass

    def clear(self):
        clearscreen()

    clearscreen = clear

    def reset(self):
        reset()

    def colormode(self, c=None):
        return colormode(c)

    def setup(self, *args, **kwargs):
        raise _cant("setup")

    def title(self, *args):
        pass

    def screensize(self, *args):
        raise _cant("screensize")


_screen = _Screen()


def Screen():
    return _screen


# ---- module-level functions: the default turtle -----------------------------------------------------------


def _pass_to_default(name):
    method = getattr(Turtle, name)

    def function(*args, **kwargs):
        return method(_default, *args, **kwargs)

    function.__name__ = name
    function.__doc__ = "Like the turtle method of the same name, on the turtle."
    return function


for _name in (
    "forward", "back", "right", "left", "goto", "setx", "sety", "setheading", "home", "circle", "dot", "penup",
    "pendown", "isdown", "pensize", "pencolor", "color", "hideturtle", "showturtle", "isvisible", "xcor", "ycor",
    "position", "heading", "distance", "towards", "clear", "write", "begin_fill", "end_fill", "fillcolor", "filling",
    "shape", "shapesize", "stamp", "clearstamp", "clearstamps", "undo",
):
    globals()[_name] = _pass_to_default(_name)
for _alias, _name in (
    ("fd", "forward"), ("bk", "back"), ("backward", "back"), ("rt", "right"), ("lt", "left"), ("setpos", "goto"),
    ("setposition", "goto"), ("seth", "setheading"), ("pu", "penup"), ("up", "penup"), ("pd", "pendown"),
    ("down", "pendown"), ("width", "pensize"), ("ht", "hideturtle"), ("st", "showturtle"), ("pos", "position"),
):
    globals()[_alias] = globals()[_name]
del _name, _alias


def reset():
    for turtle in _all_turtles():
        turtle.s.reset()
    if _stage[0] is not None:
        _emit("clear", _stage[0].s)


def clearscreen():
    if _stage[0] is not None:
        _emit("clear", _stage[0].s)


def _all_turtles():
    return [_default] + [t for t in _made if t is not _default]



def speed(value=None):
    return 0 if value is None else None


def delay(value=None):
    return 0 if value is None else None


def tracer(n=None, delay=None):
    if n is None:
        return _tracer[0]
    _tracer[0] = int(_num(n, "tracer"))


def update():
    """With tracer(0), update() shows the picture so far. GIO then holds it, like a frame of a movie."""
    if _tracer[0] == 0:
        _emit("frame", _stage_state())


def mode(m=None):
    if m is None:
        return _mode[0]
    if m not in ("standard", "logo"):
        raise TurtleGraphicsError("mode() can be 'standard' or 'logo', not %r." % (m,))
    if m != _mode[0]:
        _mode[0] = m
        for turtle in _all_turtles():
            turtle.s.reset()
        if _events:
            _emit("clear", _stage_state())


def colormode(c=None):
    if c is None:
        return _colormode[0]
    if c not in (1, 1.0, 255):
        raise TurtleGraphicsError("colormode must be 1.0 or 255.")
    _colormode[0] = float(c)


def bgcolor(*args):
    if not args:
        return _bg[0]
    _bg[0] = _color(args, "bgcolor")
    _emit("background", _stage_state(), color=_bg[0])


def onkey(fn, key):
    name = _KEY_NAMES.get(str(key).lower())
    if name is None:
        raise TurtleGraphicsError("GIO's turtle listens for the Up, Down, Left, Right and space keys, not %r." % (key,))
    if fn is None:
        _keys.pop(name, None)
    else:
        _keys[name] = fn


onkeypress = onkey


def listen(*args):
    pass


def ontimer(fn, t=0):
    ms = int(_num(t, "ontimer"))
    if fn is None:
        return
    timer_id = _next_timer[0]
    _next_timer[0] += 1
    _timers[timer_id] = (fn, max(ms, 0))


def done():
    pass


mainloop = done


def exitonclick():
    pass


def bye():
    pass


def setup(*args, **kwargs):
    raise _cant("setup")


def title(*args):
    pass


def screensize(*args):
    raise _cant("screensize")


def getscreen():
    return _screen


def _unsupported_function(name):
    def function(*args, **kwargs):
        raise _cant(name)

    function.__name__ = name
    return function


for _name in (
    "setundobuffer", "textinput", "numinput", "bgpic", "onclick", "onscreenclick", "onrelease", "ondrag",
    "window_width", "window_height", "tilt",
):
    globals()[_name] = _unsupported_function(_name)
del _name


def __getattr__(name):
    if name.startswith("__"):
        raise AttributeError(name)
    raise _cant(name)


def _ready():
    """What the host needs to know after a call: the keys that are bound and the timers that are waiting."""
    return {
        "keys": [k for k in ("UP", "DOWN", "LEFT", "RIGHT", "SPACE") if k in _keys],
        "ticks": [{"id": i, "ms": ms} for i, (_, ms) in _timers.items()],
    }
