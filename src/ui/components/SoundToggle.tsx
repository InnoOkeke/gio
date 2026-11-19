import { useEffect, useState } from 'react';
import { sound } from '../runtime/sound';
import { MusicIcon, MusicOffIcon } from './icons';

/** Sound on or off. Also unlocks the browser's audio on the first tap or key press. Hidden without Web Audio. */
export function SoundToggle() {
  const [on, setOn] = useState(sound.enabled);

  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (!sound.available) return null;
  const label = on ? 'Sound on' : 'Sound off';
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => {
        sound.enabled = !on;
        setOn(!on);
        if (!on) sound.unlock();
      }}
    >
      {on ? <MusicIcon /> : <MusicOffIcon />}
    </button>
  );
}
