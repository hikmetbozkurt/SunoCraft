import { Timeline } from '../editor/Timeline';
import { Settings } from '../editor/Settings';

export function MainLayout() {
  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left Panel — Timeline */}
      <section className="flex-1 flex flex-col border-r border-white/[0.04] min-w-0">
        <Timeline />
      </section>

      {/* Right Panel — Settings */}
      <aside className="w-80 xl:w-96 flex-shrink-0 bg-zinc-950/50">
        <Settings />
      </aside>
    </main>
  );
}
