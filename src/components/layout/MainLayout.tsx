import { Timeline } from '../editor/Timeline';
import { WaveformEditor } from '../editor/WaveformEditor';
import { Settings } from '../editor/Settings';

export function MainLayout() {
  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left Panel — Timeline / Track List */}
      <aside className="w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.04] bg-zinc-950/20">
        <Timeline />
      </aside>

      {/* Center Panel — Detailed Waveform Editor */}
      <section className="flex-1 flex flex-col min-w-0 bg-zinc-900/10">
        <WaveformEditor />
      </section>

      {/* Right Panel — Settings & Output */}
      <aside className="w-80 xl:w-96 flex-shrink-0 border-l border-white/[0.04] bg-zinc-950/50">
        <Settings />
      </aside>
    </main>
  );
}
