import { forwardRef } from 'react';
import { ADVENTURE_WORDS } from '../../logo/adventure/index.js';
import { LogoEditor, type LogoEditorHandle } from '../editor/LogoEditor';
import { logoLanguage } from '../editor/logo-language';

/** Built once: the seven adventure words are coloured and completed like commands, only in this editor. */
const ADVENTURE_LANGUAGE = logoLanguage({ words: ADVENTURE_WORDS });

interface AdventureEditorProps {
  initialCode: string;
  onChange(code: string): void;
  onRunShortcut(): void;
  onFocusChange?(focused: boolean): void;
}

/** The studio's Logo editor with the adventure words. Loaded on its own so the editor libraries stay out of the main file. */
export const AdventureEditor = forwardRef<LogoEditorHandle, AdventureEditorProps>(function AdventureEditor(props, ref) {
  return <LogoEditor ref={ref} {...props} language={ADVENTURE_LANGUAGE} hint="Tell Gio where to go, like  FD 100  RT 90" />;
});
