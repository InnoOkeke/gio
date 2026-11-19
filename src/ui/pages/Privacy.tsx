import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../components/GioMark';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[20px] font-black m-0">{title}</h2>
      <div className="text-[16px] font-semibold text-ink-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** A plain-language page for parents and teachers. Every statement here matches what the code does. */
export default function Privacy() {
  return (
    <div className="min-h-full flex items-start justify-center p-6">
      <main className="panel max-w-2xl w-full p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Wordmark />
          <Link to="/" className="btn btn-primary">
            Back to drawing
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-black m-0">Privacy for parents and teachers</h1>
          <p className="m-0 text-[16px] font-semibold text-ink-2">GIO is built so children can play without giving anything away. Here is exactly what happens with their data.</p>
        </div>

        <Section title="No accounts, no tracking">
          <p className="m-0">Children never sign up or log in, and GIO never asks for a name, email address or birthday. The first screen asks which age group a child is in (Under 8 or 8 to 12), but that choice only changes how GIO looks and stays on the device. GIO does not use cookies, advertising or analytics.</p>
        </Section>

        <Section title="What GIO saves on its server">
          <p className="m-0">Only a drawing a child chooses to save: its title and its Logo code, with a secret link and edit key. Nothing else about the child is stored.</p>
          <p className="m-0">Anyone who has a drawing&rsquo;s share link can see its title and code, so ask children not to put personal details in titles or code. There is no public gallery, so a drawing can only be found if someone has its link.</p>
          <p className="m-0">The edit key is given only to the browser that saved the drawing. People who open the link can watch and save their own copy, but they cannot change the original.</p>
        </Section>

        <Section title="What stays in the browser">
          <p className="m-0">Quest progress and badges, which quests earned a gold or silver star, which islands on the adventure map are sailed, the calendar dates used to plan short review visits, the age mode a child picked, the read-aloud setting, an unsaved draft and the edit keys for saved drawings are kept in the browser&rsquo;s own storage (localStorage) on that device. GIO&rsquo;s server never receives the progress, settings or draft. A drawing&rsquo;s edit key is stored in the browser and sent to GIO only when the child saves changes to that drawing. Clearing the browser&rsquo;s site data removes them.</p>
          <p className="m-0">GIO also remembers, for each age group, whether the first-drawing welcome has already been shown (the key is called gio.firstWin). It stays on the device and is never sent to GIO.</p>
          <p className="m-0">Stages are kept the same way. Which stages a child sailed, which ones they tested out of with a skill check, and the date they became a Logo Master (all in <code>gio.path</code>), and whether Gio wears the golden shell (<code>gio.rewards</code>) never leave the browser. A skill check itself is not saved: leaving it simply ends it.</p>
          <p className="m-0">The Logo Master certificate has a box for a name. If someone types one, it is kept in the browser (<code>gio.certificate</code>), up to 40 characters, so it is still there next time. It is never sent to GIO&rsquo;s server and is not put in the link. The &ldquo;Forget my name&rdquo; button on the certificate page deletes it, and so does clearing the site data. The name only appears on the printed page if someone prints it.</p>
        </Section>

        <Section title="Pictures, movies and drawing files">
          <p className="m-0">Pictures, movies and drawing files (SVG) are made on the child&rsquo;s own device and saved to its downloads folder, or shared through the phone&rsquo;s own share menu. Nothing is uploaded to GIO. A movie carries only the drawing and a small &ldquo;Made with GIO&rdquo; mark.</p>
        </Section>

        <Section title="Music and sound">
          <p className="m-0">Notes from <code>PLAY</code> are made on the child&rsquo;s own device by the browser&rsquo;s built-in audio. GIO plays no recordings, never uses the microphone for music, and uploads nothing. The sound on/off setting is kept in the browser (the key is called gio.sound) and is never sent to GIO.</p>
        </Section>

        <Section title="The turtle helper (AI)">
          <p className="m-0">When a child asks the turtle to draw or explain something, the words they typed or said, and the code in the editor, are sent to Amazon Bedrock, an AWS service, which runs the Qwen3 Coder model.</p>
          <p className="m-0">When a child taps &ldquo;I&rsquo;m stuck&rdquo;, the code in the editor, which quest they are on and which hint step they asked for (Think, Look or Fix) are sent to Amazon Bedrock the same way. Hints go through the same two checks and count toward the same daily limits. Hints are not stored, and they never change progress, badges or stickers.</p>
          <p className="m-0">Before anything is drawn, every request is checked twice: against a list of words GIO never allows, and by an AI safety check. Requests that fail are turned down with a friendly message, such as &ldquo;Let&rsquo;s draw something else!&rdquo;. If the safety check cannot run, the turtle waits and asks the child to try again instead of guessing.</p>
          <p className="m-0">GIO does not keep a record of what children ask the turtle. The AI only ever writes Logo code, and GIO runs that code in its own turtle. It never runs anything else.</p>
        </Section>

        <Section title="Talking to the turtle">
          <p className="m-0">The microphone button uses the speech recognition built into the browser, and only works in browsers that have it. In Chrome and Edge the browser sends the audio to Google or Microsoft to turn it into text. GIO never receives the audio, only the text. The button only listens after a child taps it, and children can always type instead.</p>
        </Section>

        <Section title="Limits that protect children and cost">
          <p className="m-0">The turtle helper has a limit on how many requests each internet connection and the whole site can make per day. The whole-site limit is a single daily number saved on the server. The per-connection limit is held only in the server&rsquo;s memory and is never saved.</p>
          <p className="m-0">Like almost every website, the web server that hosts GIO writes standard connection logs (the internet address, the time and the page requested). These logs do not include what a child typed to the turtle or the code they wrote, and GIO does not use them to follow children around.</p>
        </Section>

        <p className="m-0 text-[14px] font-semibold text-ink-3">GIO is an open-source project under the MIT licence.</p>
      </main>
    </div>
  );
}
