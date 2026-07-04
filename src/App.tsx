import { EditorProvider } from './context/EditorProvider';
import { ToastProvider } from './context/ToastContext';
import { AppInner } from './AppInner';

function App() {
  return (
    <EditorProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </EditorProvider>
  );
}

export default App;
