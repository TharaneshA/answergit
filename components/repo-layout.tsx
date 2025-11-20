"use client"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Suspense, useState } from "react"
import FileExplorer from "@/components/file-explorer"
import AiAssistant from "@/components/ai-assistant"
import FileViewer from "@/components/file-viewer"
import RepoAnalyzer from "@/components/repo-analyzer"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface RepoLayoutProps {
    repoData: any
    username: string
    repo: string
}

export default function RepoLayout({ repoData, username, repo }: RepoLayoutProps) {
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
    const [isRightCollapsed, setIsRightCollapsed] = useState(false)

    return (
        <div className="h-screen bg-background text-foreground font-sans overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-lg border-border">

                {/* Left Sidebar - File Explorer */}
                <ResizablePanel
                    defaultSize={20}
                    minSize={15}
                    maxSize={30}
                    collapsible={true}
                    onCollapse={() => setIsLeftCollapsed(true)}
                    onExpand={() => setIsLeftCollapsed(false)}
                    className={cn(isLeftCollapsed && "min-w-[50px] transition-all duration-300 ease-in-out")}
                >
                    <div className="h-full flex flex-col border-r border-border shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)] z-10 relative">
                        <Suspense
                            fallback={
                                <div className="p-4">
                                    <Skeleton className="h-[500px] bg-zinc-800" />
                                </div>
                            }
                        >
                            <FileExplorer repoData={repoData} />
                        </Suspense>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle - File Viewer */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex flex-col h-full min-w-0 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)] z-10 relative">
                        <RepoAnalyzer username={username} repo={repo} />
                        <div className="flex-1 overflow-hidden border-r border-border">
                            <Suspense
                                fallback={
                                    <div className="p-4">
                                        <Skeleton className="h-[500px] bg-zinc-800" />
                                    </div>
                                }
                            >
                                <FileViewer repoData={repoData} />
                            </Suspense>
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right - AI Assistant */}
                <ResizablePanel
                    defaultSize={30}
                    minSize={20}
                    maxSize={50}
                    collapsible={true}
                    onCollapse={() => setIsRightCollapsed(true)}
                    onExpand={() => setIsRightCollapsed(false)}
                >
                    <div className="h-full flex flex-col min-w-0">
                        <AiAssistant username={username} repo={repo} />
                    </div>
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    )
}
