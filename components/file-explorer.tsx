"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, FileCode, FileText, Folder, Search, FileJson, Package, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { EnhancedLoading } from "@/components/enhanced-loading"

interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  content?: string
  children?: FileNode[]
  loaded?: boolean
}

interface FileExplorerProps {
  repoData: {
    files: FileNode[]
  }
}

export default function FileExplorer({ repoData }: FileExplorerProps) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const pathParts = pathname.split("/")
  const username = pathParts[1] || ""
  const repo = pathParts[2] || ""
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "public"]))
  // Remove loading state since repoData is passed as a prop and should be available
  if (!repoData?.files) {
    return (
      <div className="flex items-center justify-center h-full">
        <EnhancedLoading />
      </div>
    )
  }

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const findFileNode = (path: string, nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileNode(path, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileClick = async (path: string) => {
    const fileNode = findFileNode(path, repoData.files);

    if (!fileNode) {
      console.error(`File node not found: ${path}`);
      return;
    }

    // Get current file path from URL
    const currentPath = new URLSearchParams(window.location.search).get('file');

    // Only navigate if we're viewing a different file
    if (currentPath !== path) {
      try {
        router.push(`/${username}/${repo}?file=${encodeURIComponent(path)}`);
      } catch (error) {
        console.error('Error navigating to file:', error);
      }
    }
  }


  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (fileName === "package.json" || fileName === "package-lock.json") {
      return <Package className="h-4 w-4 mr-2 text-orange-400" />
    }

    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <FileCode className="h-4 w-4 mr-2 text-blue-400" />
      case "json":
        return <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
      case "md":
        return <FileText className="h-4 w-4 mr-2 text-purple-400" />
      default:
        return <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
    }
  }

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes
      .filter((node) => searchQuery === "" || node.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((node) => {
        const isExpanded = expandedFolders.has(node.path)

        return (
          <div key={node.path} className="select-none">
            <div
              className={cn(
                "flex items-center py-1.5 px-2 hover:bg-muted rounded cursor-pointer text-sm",
                level > 0 && "ml-4",
              )}
              onClick={(e) => (node.type === "directory" ? toggleFolder(node.path, e) : handleFileClick(node.path))}
            >
              {node.type === "directory" ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
                  )}
                  <Folder className="h-4 w-4 mr-2 text-blue-400" />
                </>
              ) : (
                <>
                  <span className="w-4 mr-1" />
                  {getFileIcon(node.name)}
                </>
              )}
              <span className="truncate font-mono text-xs">{node.name}</span>
            </div>

            {node.type === "directory" && isExpanded && node.children && (
              <div>{renderFileTree(node.children, level + 1)}</div>
            )}
          </div>
        )
      })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-3 border-b border-border">
        <div className="text-lg mb-3 flex items-center gap-1">
          <Link href={`/${username}`} className="text-emerald-400 hover:text-emerald-300">
            {username}
          </Link>
          <span className="text-foreground">/</span>
          <Link href={`https://github.com/${username}/${repo}`} className="text-foreground hover:text-emerald-300">
            {repo}
          </Link>
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-8 h-8 bg-muted border-border text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">{renderFileTree(repoData.files)}</div>
      </ScrollArea>
    </div>
  )
}

