import { EditorProvider } from './context/EditorProvider';
import { Header } from './components/layout/Header';
import { MainLayout } from './components/layout/MainLayout';
import { UploadModal } from './components/shared/UploadModal';

function App() {
  return (
    <EditorProvider>
      <div className="flex flex-col h-screen bg-zinc-950">
        <Header />
        <MainLayout />
        <UploadModal />
      </div>
    </EditorProvider>
  );
}

export default App;
