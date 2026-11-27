import { useEffect, useRef } from 'react';
import type { RealmId } from '../../logo/adventure/index.js';
import { Sheet } from '../components/Sheet';
import { FriendPicture } from '../components/gio/FriendArt';
import { TurtleSprite } from '../components/TurtleSprite';
import { RealmBanner } from './art/banner';
import { realmInfo } from './realms';
import { useLang, useT } from '../lang';

interface IntroCardProps {
  realm: RealmId;
  /** Read the story aloud (read-aloud is on). */
  speak?(text: string): void;
  onGo(): void;
}

/** The first time a child enters a world: its story, its friend and a way in. Skippable. */
export function IntroCard({ realm, speak, onGo }: IntroCardProps) {
  const t = useT();
  const { lang } = useLang();
  const info = realmInfo(realm, lang);
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    speak?.(info.story);
    // Read once, when the card opens.
  }, []);
  return (
    <Sheet open variant="dialog" labelledBy="adv-intro-title" onClose={onGo} initialFocus={go} className="sheet-white adv-intro">
      <div className="adv-intro-body" data-sheet-header>
        <div className="adv-intro-art">
          <RealmBanner realm={realm} />
          <div className="adv-intro-friend" aria-hidden="true">
            {info.friend ? <FriendPicture id={info.friend} size={96} /> : <TurtleSprite mood="happy" />}
          </div>
        </div>
        <p className="eyebrow m-0">{t('adv.intro.new')}</p>
        <h2 id="adv-intro-title" className="adv-result-title">
          {info.name}
        </h2>
        <p className="adv-result-line">{info.story}</p>
        <button ref={go} type="button" className="btn btn-primary btn-lg adv-intro-go" onClick={onGo}>
          {t('adv.intro.go')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onGo}>
          {t('btn.skip')}
        </button>
      </div>
    </Sheet>
  );
}
