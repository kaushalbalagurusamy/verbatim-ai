
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MainEditor } from '@/components/MainEditor';
import { ChatPanel } from '@/components/ChatPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Index = () => {
  const [activeView, setActiveView] = useState<'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null>('document');

  return (
    <div className="h-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Sidebar Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
          <Sidebar 
            collapsed={false} 
            onToggle={() => {}}
            onActiveViewChange={setActiveView}
          />
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Main Editor Panel */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <MainEditor activeView={activeView} />
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Chat Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
          <ChatPanel 
            collapsed={false}
            onToggle={() => {}}
            activeView={activeView}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
