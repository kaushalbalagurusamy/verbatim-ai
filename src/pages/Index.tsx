
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MainEditor } from '@/components/MainEditor';
import { ChatPanel } from '@/components/ChatPanel';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow' | null>('document');

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] flex">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onActiveViewChange={setActiveView}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <MainEditor activeView={activeView} />
      </div>
      
      {/* Chat Panel */}
      <ChatPanel 
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed(!chatCollapsed)}
        activeView={activeView}
      />
    </div>
  );
};

export default Index;
