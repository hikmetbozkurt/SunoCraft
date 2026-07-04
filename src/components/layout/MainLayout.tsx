import { useCallback, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { Sidebar } from './Sidebar';
import { Timeline } from '../editor/Timeline';
import { WaveformEditor } from '../editor/WaveformEditor';
import { PropertiesPanel } from '../editor/PropertiesPanel';
import { PreviewPanel } from '../preview/PreviewPanel';

interface MainLayoutProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
}

export function MainLayout({ analyserRef }: MainLayoutProps) {
  const { state, setPanelSize } = useEditor();

  // ── Resize State ──────────────────────────────────────────────
  const [isResizing, setIsResizing] = useState<'sidebar' | 'properties' | 'preview' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Sidebar Resize Handler ────────────────────────────────────
  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing('sidebar');
    const startX = e.clientX;
    const startWidth = state.sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + diff));
      setPanelSize('sidebar', newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [state.sidebarWidth, setPanelSize]);

  // ── Properties Resize Handler ─────────────────────────────────
  const handlePropertiesResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing('properties');
    const startX = e.clientX;
    const startWidth = state.propertiesWidth;

    const onMouseMove = (e: MouseEvent) => {
      const diff = startX - e.clientX;
      const newWidth = Math.max(200, Math.min(420, startWidth + diff));
      setPanelSize('properties', newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [state.propertiesWidth, setPanelSize]);

  // ── Preview Resize Handler (vertical) ─────────────────────────
  const handlePreviewResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing('preview');
    const container = containerRef.current;
    if (!container) return;
    const startY = e.clientY;
    const startHeight = state.previewHeight;
    const containerHeight = container.getBoundingClientRect().height;

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientY - startY;
      const diffPercent = (diff / containerHeight) * 100;
      const newHeight = Math.max(20, Math.min(70, startHeight + diffPercent));
      setPanelSize('preview', newHeight);
    };

    const onMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [state.previewHeight, setPanelSize]);

  return (
    <main
      ref={containerRef}
      className={`flex-1 flex overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}
    >
      {/* ── Left Sidebar ─────────────────────────────────────── */}
      <aside
        className="flex-shrink-0 border-r border-white/[0.04] relative"
        style={{ width: state.sidebarWidth }}
      >
        <Sidebar />
        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-violet-500/30 transition-colors z-10"
          onMouseDown={handleSidebarResize}
        />
      </aside>

      {/* ── Center (Preview + Editor) ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Preview Panel (top) */}
        <div
          className="flex-shrink-0 border-b border-white/[0.04] relative"
          style={{ height: `${state.previewHeight}%` }}
        >
          <PreviewPanel analyserRef={analyserRef} />
          {/* Vertical Resize Handle */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-violet-500/30 transition-colors z-10"
            onMouseDown={handlePreviewResize}
          />
        </div>

        {/* Editor Panel (bottom) */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Timeline */}
          <div className="flex-1 min-h-0">
            <Timeline />
          </div>

          {/* Waveform Editor (detail view for selected track) */}
          {state.activeTrackId && (
            <div className="flex-shrink-0 border-t border-white/[0.04]" style={{ height: '240px' }}>
              <WaveformEditor />
            </div>
          )}
        </div>
      </div>

      {/* ── Right Properties Panel ───────────────────────────── */}
      <aside
        className="flex-shrink-0 border-l border-white/[0.04] relative"
        style={{ width: state.propertiesWidth }}
      >
        {/* Resize Handle */}
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-violet-500/30 transition-colors z-10"
          onMouseDown={handlePropertiesResize}
        />
        <PropertiesPanel />
      </aside>
    </main>
  );
}
