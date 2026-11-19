"""GIO's winsound: Beep(hz, ms) becomes a note on GIO's stage instead of a beep from the computer."""
import turtle as _turtle

__all__ = ["Beep"]


def Beep(frequency, duration):
    if not isinstance(frequency, int) or not isinstance(duration, int):
        raise TypeError("Beep needs whole numbers: Beep(hertz, milliseconds)")
    if frequency < 37 or frequency > 32767:
        raise ValueError("frequency must be in 37 thru 32767")
    if duration < 0:
        raise ValueError("duration must not be negative")
    _turtle._emit_play([{"hz": frequency, "seconds": duration / 1000.0}])


def __getattr__(name):
    if name.startswith("__"):
        raise AttributeError(name)
    raise _turtle.TurtleGraphicsError("GIO's winsound can only Beep(hertz, milliseconds), not %s." % name)
