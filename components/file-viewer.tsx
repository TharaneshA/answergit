"use client"

import { useSearchParams, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import Image from "next/image"
import dynamic from 'next/dynamic'
import NotebookViewer from './notebook-viewer'
import "../styles/markdown.css"
import * as React from "react"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

// Dynamically import PDF components with no SSR
const PDFViewer = dynamic(
  () => import('./pdf-viewer').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full">
        <Skeleton className="w-32 h-32 bg-muted" />
      </div>
    )
  }
)

interface FileViewerProps {
  repoData?: {
    files: {
      name: string
      path: string
      type: "file" | "directory"
      content?: string
      children?: any[]
    }[]
  }
}

// Helper function to determine file type based on extension
function getFileType(filePath: string): 'image' | 'pdf' | 'markdown' | 'text' | 'notebook' {
  if (!filePath) return 'text';

  const extension = filePath.split('.').pop();
  if (!extension) return 'text';

  const ext = extension.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'avif'].includes(ext)) {
    return 'image';
  } else if (ext === 'pdf') {
    return 'pdf';
  } else if (ext === 'ipynb') {
    return 'notebook';
  } else if (['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdwn', 'mdtxt', 'mdtext'].includes(ext)) {
    return 'markdown';
  } else {
    return 'text';
  }
}

export default function FileViewer({ repoData }: FileViewerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filePath = searchParams?.get("file");
  const pathParts = pathname?.split("/") || [];
  const username = pathParts[1] || '';
  const repo = pathParts[2] || '';
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'markdown' | 'text' | 'notebook'>('text');
  const [base64Content, setBase64Content] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!filePath) {
      setFileContent(null)
      setError(null)
      return
    }

    // Reset states
    setIsLoading(true)
    setError(null)
    setZoomLevel(1)

    // Determine file type based on extension
    setFileType(getFileType(filePath))

    // Find file content in the cached data first
    const findFileContent = (files: any[]): string | null => {
      if (!files) return null;

      for (const file of files) {
        if (file.path === filePath) {
          return file.content || null;
        }
        if (file.children) {
          const content = findFileContent(file.children);
          if (content) return content;
        }
      }
      return null;
    };

    // Try to get content from cache first
    const cachedContent = repoData?.files ? findFileContent(repoData.files) : null;

    if (cachedContent) {
      setFileContent(cachedContent);
      setIsLoading(false);
      return;
    }

    // If not in cache, fetch from API
    const fetchFileContent = async () => {
      try {
        const response = await fetch(`/api/file-content?path=${encodeURIComponent(filePath)}&username=${encodeURIComponent(username)}&repo=${encodeURIComponent(repo)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch file content')
        }

        const content = await response.json()
        setFileContent(content)

        // For image files, we need to handle base64 encoding
        if (getFileType(filePath) === 'image') {
          // Check if content is already base64 encoded
          if (content.startsWith('data:image')) {
            setBase64Content(content)
          } else {
            // Convert to base64 if needed
            try {
              // For binary content, it should already be base64 encoded from the API
              // Just add the proper data URL prefix and strip newlines
              const extension = filePath.split('.').pop()?.toLowerCase()
              const cleanContent = content.replace(/\s/g, '');
              setBase64Content(`data:image/${extension};base64,${cleanContent}`)
            } catch (e) {
              console.error('Error converting image to base64:', e)
              setError('Failed to display image')
            }
          }
        }
      } catch (err) {
        console.error('Error fetching file content:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch file content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFileContent()
  }, [filePath, repoData?.files, pathname, username, repo])

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>Select a file to view its content</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="border-b bg-muted p-2 px-4 text-sm font-mono text-muted-foreground rounded-t-lg">{filePath}</div>
        <div className="p-4">
          <Skeleton className="h-[20px] w-3/4 mb-2 bg-muted" />
          <Skeleton className="h-[20px] w-1/2 mb-2 bg-muted" />
          <Skeleton className="h-[20px] w-5/6 mb-2 bg-muted" />
          <Skeleton className="h-[20px] w-2/3 mb-2 bg-muted" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b bg-muted p-2 px-4 text-sm font-mono text-muted-foreground rounded-t-lg">{filePath}</div>
        <div className="flex-1 flex items-center justify-center text-red-400">
          <div className="text-center p-4">
            <p>Error loading file: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!fileContent) {
    return (
      <div className="p-4">
        <div className="border-b bg-muted p-2 px-4 text-sm font-mono text-muted-foreground rounded-t-lg">{filePath}</div>
        <div className="p-4">
          <Skeleton className="h-[20px] w-3/4 mb-2 bg-muted" />
          <Skeleton className="h-[20px] w-1/2 mb-2 bg-muted" />
          <Skeleton className="h-[20px] w-5/6 mb-2 bg-muted" />
          <Skeleton className="h-[20px] w-2/3 mb-2 bg-muted" />
        </div>
      </div>
    )
  }

  // Render different content based on file type
  const renderContent = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-end gap-2 p-2 border-b border-border bg-muted/30">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
              {base64Content ? (
                <div
                  className="relative transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* Checkerboard background for transparency */}
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                  <img
                    src={base64Content}
                    alt="File content"
                    className="max-w-full max-h-[80vh] object-contain shadow-lg rounded-sm"
                  />
                </div>
              ) : (
                <div className="text-red-400">Unable to load image</div>
              )}
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="flex flex-col h-full bg-zinc-100 dark:bg-zinc-900">
            {fileContent ? (
              <PDFViewer pdfData={fileContent.startsWith('data:application/pdf;base64,') ? fileContent : `data:application/pdf;base64,${fileContent.replace(/\s/g, '')}`} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center">
                  <p>Unable to display PDF</p>
                </div>
              </div>
            )}
          </div>
        )
      case 'notebook':
        return (
          <div className="flex flex-col items-center justify-center p-4 h-full bg-card rounded-lg">
            {fileContent ? (
              <NotebookViewer notebookData={fileContent} />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <p>Unable to display notebook</p>
              </div>
            )}
          </div>
        )
      case 'markdown':
        return (
          <div className="p-8 prose dark:prose-invert max-w-none bg-card rounded-lg">
            {fileContent ? (
              <div className="markdown-content">
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Handle video elements directly
                    video: ({ node, ...props }) => (
                      <video
                        controls
                        className="w-full max-w-3xl mx-auto rounded-lg shadow-lg my-4"
                        {...props}
                      />
                    ),
                    img: ({ node, ...props }) => (
                      <img
                        className="rounded-lg shadow-sm max-w-full h-auto"
                        {...props}
                      />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-emerald-500 hover:underline" {...props} />
                    )
                  }}
                >
                  {fileContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <p>No content to display</p>
              </div>
            )}
          </div>
        )
      default:
        return (
          <div className="p-4 bg-card rounded-lg">
            <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto text-zinc-900 dark:text-zinc-300">
              <code className="language-text">{fileContent}</code>
            </pre>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b bg-muted p-2 px-4 text-sm font-mono text-muted-foreground rounded-t-lg flex justify-between items-center">
        <span>{filePath}</span>
        <span className="text-xs opacity-70 uppercase">{fileType}</span>
      </div>
      <ScrollArea className="flex-1">
        {renderContent()}
      </ScrollArea>
    </div>
  )
}

