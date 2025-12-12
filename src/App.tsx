import { ChatInterface, PresentationViewer, Sidebar } from '@/components/layout';
import { OnboardingDialog } from '@/components/onboarding';
import { SettingsSheet } from '@/components/settings';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useState } from 'react';
import './App.css';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950">
      <OnboardingDialog />
      
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Sidebar */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={30}>
          <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-zinc-800 hover:bg-zinc-700 transition-colors" />

        {/* Canvas */}
        <ResizablePanel defaultSize={52} minSize={30}>
          <PresentationViewer />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-zinc-800 hover:bg-zinc-700 transition-colors" />

        {/* Chat */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <ChatInterface />
        </ResizablePanel>
      </ResizablePanelGroup>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default App;
