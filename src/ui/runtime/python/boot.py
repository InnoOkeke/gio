"""Sets up GIO's Python: installs the turtle and winsound modules and answers the host's calls.

The host (worker.ts, or a test) runs this file once with three names already defined:
  SOURCES      the text of turtle.py and winsound.py
  COLORS_JSON  GIO's colour table as JSON, lower-case name to #rrggbb
Afterwards it calls run(code), press(key) and fire(timer_id). Each returns JSON text:
  {"events": [...], "error": null or {"message": ..., "line": ...}, "ready": {"keys": [...], "ticks": [...]}}
"""
import builtins
import json
import sys
import time
import types

_FILE = "<gio>"
_COLORS = json.loads(COLORS_JSON)  # noqa: F821  (defined by the host)
_real_sleep = time.sleep
_state = {"turtle": None, "ns": None}


def _install(name, source):
    module = types.ModuleType(name)
    module.__file__ = "<gio-%s>" % name
    sys.modules[name] = module
    exec(compile(source, module.__file__, "exec"), module.__dict__)
    return module


def _fresh_world():
    """Every run starts from a clean turtle, clean keys and clean timers."""
    turtle = _install("turtle", SOURCES["turtle"])  # noqa: F821
    turtle.COLORS.clear()
    turtle.COLORS.update(_COLORS)
    for t in turtle._made:
        t.s.reset()
    _install("winsound", SOURCES["winsound"])  # noqa: F821
    time.sleep = turtle._emit_wait
    _state["turtle"] = turtle
    return turtle


class _Out:
    """print() becomes the stage's printed lines, one event for each line."""

    def __init__(self):
        self.buffer = ""

    def write(self, text):
        self.buffer += str(text)
        while "\n" in self.buffer:
            line, self.buffer = self.buffer.split("\n", 1)
            self._line(line)
        return len(text)

    def _line(self, line):
        turtle = _state["turtle"]
        turtle._emit("print", turtle._stage_state(), text=line[:200])

    def flush(self):
        if self.buffer:
            line, self.buffer = self.buffer, ""
            self._line(line)


class _Err:
    def write(self, text):
        return len(text)

    def flush(self):
        pass


_out = _Out()
sys.stdout = _out
sys.stderr = _Err()


def _no_input(*args, **kwargs):
    raise _state["turtle"].TurtleGraphicsError("GIO can't ask questions with input() yet.")


builtins.input = _no_input


def _describe(error):
    turtle = _state["turtle"]
    line = 0
    tb = error.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == _FILE:
            line = tb.tb_lineno
        tb = tb.tb_next
    if isinstance(error, SyntaxError):
        return {"message": "SyntaxError: %s" % (error.msg,), "line": error.lineno or 0}
    if isinstance(error, turtle.TurtleGraphicsError):
        return {"message": str(error), "line": line}
    return {"message": "%s: %s" % (type(error).__name__, error), "line": line}


def _result(error=None):
    turtle = _state["turtle"]
    try:
        _out.flush()
    except Exception as flush_error:  # the event cap, for example
        error = error or flush_error
    return json.dumps(
        {
            "events": turtle._take_events(),
            "error": _describe(error) if error is not None else None,
            "ready": turtle._ready(),
        }
    )


def run(code, filename=_FILE):
    turtle = _fresh_world()
    turtle._begin_call()
    _out.buffer = ""
    _state["ns"] = {"__name__": "__main__"}
    try:
        exec(compile(code, filename, "exec"), _state["ns"])
    except SystemExit:
        return _result()
    except Exception as error:
        return _result(error)
    return _result()


def _call(fn):
    turtle = _state["turtle"]
    turtle._begin_call()
    try:
        fn()
    except SystemExit:
        pass
    except Exception as error:
        return _result(error)
    return _result()


def press(key):
    turtle = _state["turtle"]
    fn = turtle._keys.get(key) if turtle is not None else None
    if fn is None:
        return _result() if turtle is not None else json.dumps({"events": [], "error": None, "ready": {"keys": [], "ticks": []}})
    return _call(fn)


def fire(timer_id):
    turtle = _state["turtle"]
    entry = turtle._timers.pop(timer_id, None) if turtle is not None else None
    if entry is None:
        return _result() if turtle is not None else json.dumps({"events": [], "error": None, "ready": {"keys": [], "ticks": []}})
    return _call(entry[0])
