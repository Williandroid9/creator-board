import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { VideoModal } from "../VideoModal";
import { Toast } from "../ui";
import { Header } from "./Header";
import { MainContent } from "./MainContent";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    modalOpen,
    editingVideo,
    data,
    setModalOpen,
    setEditingVideoId,
    createVideo,
    updateVideo,
    deleteVideo,
    duplicateVideo,
    toggleArchiveVideo,
    toast,
  } = useApp();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — fixed, always visible */}
      <Sidebar />

      {/* Mobile sidebar — drawer */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <MainContent />
      </div>

      {/* Global overlays */}
      <VideoModal
        open={modalOpen}
        video={editingVideo}
        videos={data.videos}
        channels={data.channels}
        inspirations={data.inspirations}
        onClose={() => {
          setModalOpen(false);
          setEditingVideoId(null);
        }}
        onCreate={createVideo}
        onUpdate={updateVideo}
        onDelete={deleteVideo}
        onDuplicate={duplicateVideo}
        onToggleArchive={toggleArchiveVideo}
      />
      <Toast message={toast} />
    </div>
  );
}
