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

  useEffect(() => {
    if (!filePath) {
      setFileContent(null)
      setError(null)
      return
    }

    // Reset states
    setIsLoading(true)
    setError(null)

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
        if (fileType === 'image') {
          // Check if content is already base64 encoded
          if (content.startsWith('data:image')) {
            setBase64Content(content)
          } else {
            // Convert to base64 if needed
            try {
              // For binary content, it should already be base64 encoded from the API
              // Just add the proper data URL prefix
              const extension = filePath.split('.').pop()?.toLowerCase()
              setBase64Content(`data:image/${extension};base64,${content}`)
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
          <div className="flex items-center justify-center p-4 h-full bg-card rounded-lg">
            {base64Content ? (
              <div className="relative group cursor-zoom-in transition-transform hover:scale-105">
                <img
                  src={base64Content}
                  alt="File content"
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
            ) : (
              <div className="text-red-400">Unable to load image</div>
            )}
          </div>
        );
      case 'pdf':
        return (
          <div className="flex flex-col items-center justify-center p-4 h-full bg-card rounded-lg">
            {fileContent ? (
              <PDFViewer pdfData={fileContent.startsWith('data:application/pdf;base64,') ? fileContent : `data:application/pdf;base64,${fileContent}`} />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Unable to display PDF</p>
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
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Unable to display notebook</p>
              </div>
            )}
          </div>
        )
      case 'markdown':
        return (
          <div className="p-6 prose dark:prose-invert max-w-none bg-card rounded-lg">
            {fileContent ? (
              <div className="markdown-content">
                <ReactMarkdown components={{
                  // Handle div elements with alignment and other HTML attributes
                  div: ({ node, className, children, ...props }) => {
                    return <div className={className} {...props}>{children}</div>;
                  },

                  // Handle HTML content in markdown, including video tags
                  p: ({ node, className, children, ...props }) => {
                    const childrenArray = React.Children.toArray(children);
                    const hasHtmlContent = childrenArray.some(child =>
                      typeof child === 'string' && (
                        child.includes('<div') ||
                        child.includes('<video') ||
                        child.includes('<source') ||
                        child.includes('<h2')
                      )
                    );

                    if (hasHtmlContent) {
                      const htmlContent = childrenArray.map(child =>
                        typeof child === 'string' ? child : ''
                      ).join('');
                      return (
                        <div
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                          className="markdown-content"
                          {...props}
                        />
                      );
                    }

                    return <p className={className} {...props}>{children}</p>;
                  },
                  // Handle video elements directly
                  video: ({ node, ...props }) => (
                    <video
                      controls
                      className="w-full max-w-3xl mx-auto rounded-lg shadow-lg"
                      {...props}
                    />
                  )
                }}>{fileContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
      <div className="border-b bg-muted p-2 px-4 text-sm font-mono text-muted-foreground rounded-t-lg">{filePath}</div>
      <ScrollArea className="flex-1">
        {renderContent()}
      </ScrollArea>
    </div>
  )
}

