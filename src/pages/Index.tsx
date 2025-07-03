
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MainEditor } from '@/components/MainEditor';
import { ChatPanel } from '@/components/ChatPanel';
import { TopBar } from '@/components/TopBar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Index = () => {
  const [activeView, setActiveView] = useState<'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null>('document');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [chatVisible, setChatVisible] = useState(true);
  const [mainEditorVisible, setMainEditorVisible] = useState(true);

  return (
    <div className="h-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden flex flex-col">
      {/* Top Bar spanning all panes */}
      <TopBar 
        sidebarVisible={sidebarVisible}
        chatVisible={chatVisible}
        mainEditorVisible={mainEditorVisible}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onToggleChat={() => setChatVisible(!chatVisible)}
        onToggleMainEditor={() => setMainEditorVisible(!mainEditorVisible)}
      />
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          {sidebarVisible && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                <Sidebar 
                  collapsed={false} 
                  onToggle={() => {}}
                  onActiveViewChange={setActiveView}
                />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          
          {/* Main Editor Panel */}
          {mainEditorVisible && (
            <>
              <ResizablePanel defaultSize={sidebarVisible && chatVisible ? 60 : 80} minSize={40}>
                <MainEditor activeView={activeView} />
              </ResizablePanel>
              {chatVisible && <ResizableHandle />}
            </>
          )}
          
          {/* Chat Panel */}
          {chatVisible && (
            <>
              {!mainEditorVisible && sidebarVisible && <ResizableHandle />}
              <ResizablePanel 
                defaultSize={chatVisible && !mainEditorVisible && !sidebarVisible ? 100 : 20} 
                minSize={15} 
                maxSize={chatVisible && !mainEditorVisible && !sidebarVisible ? 100 : 40}
              >
                <ChatPanel 
                  collapsed={false}
                  onToggle={() => {}}
                  activeView={activeView}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Index;
