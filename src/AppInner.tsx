import { useEffect } from 'react';
import { useEditor } from './hooks/useEditor';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Toolbar } from './components/layout/Toolbar';
import { MainLayout } from './components/layout/MainLayout';
import { TransportBar } from './components/layout/TransportBar';
import { StatusBar } from './components/layout/StatusBar';
import { UploadModal } from './components/shared/UploadModal';
import { ToastContainer } from './components/shared/Toast';

/**
 * Inner App — lives inside providers, can use all hooks.
 */
export function AppInner() {
  const { toggleUploadModal, toggleExportDialog } = useEditor();
  const engine = useAudioEngine();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    togglePlayPause: engine.togglePlayPause,
    stop: engine.stop,
  });

  // Custom event listeners for editor actions
  useEffect(() => {
    const handleImport = () => toggleUploadModal(true);
    const handleExport = () => toggleExportDialog(true);
    const handlePlayPause = () => engine.togglePlayPause();
    const handleStop = () => engine.stop();
    const handleSeek = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === 'number') {
        engine.seek(customEvent.detail);
      }
    };

    document.addEventListener('sunocraft:import', handleImport);
    document.addEventListener('sunocraft:export', handleExport);
    document.addEventListener('sunocraft:playpause', handlePlayPause);
    document.addEventListener('sunocraft:stop', handleStop);
    document.addEventListener('sunocraft:seek', handleSeek);

    return () => {
      document.removeEventListener('sunocraft:import', handleImport);
      document.removeEventListener('sunocraft:export', handleExport);
      document.removeEventListener('sunocraft:playpause', handlePlayPause);
      document.removeEventListener('sunocraft:stop', handleStop);
      document.removeEventListener('sunocraft:seek', handleSeek);
    };
  }, [toggleUploadModal, toggleExportDialog, engine]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      <Toolbar
        onImport={() => toggleUploadModal(true)}
        onExport={() => toggleExportDialog(true)}
      />
      <MainLayout analyserRef={engine.analyserRef} onSeek={engine.seek} />
      <TransportBar
        onPlayPause={engine.togglePlayPause}
        onStop={engine.stop}
        onSeek={engine.seek}
        onSetMasterVolume={engine.setMasterVolume}
      />
      <StatusBar />
      <UploadModal />
      <ToastContainer />
    </div>
  );
}
