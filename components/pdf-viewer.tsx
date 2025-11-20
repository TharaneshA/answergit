'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  pdfData: string
}

export default function PDFViewer({ pdfData }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.0)

  // Validate and format PDF data
  const validateAndFormatPDFData = (data: string) => {
    if (!data) return null

    // If it's a remote URL, return it directly
    if (data.startsWith('http')) {
      return data
    }

    // Remove any whitespace and line breaks
    const cleanData = data.replace(/\s/g, '')

    // If it already has the prefix, return it
    if (cleanData.startsWith('data:application/pdf;base64,')) {
      return cleanData
    }

    // Otherwise, assume it's raw base64 and add the prefix
    return `data:application/pdf;base64,${cleanData}`
  }

  const pdfUrl = validateAndFormatPDFData(pdfData)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => setScale(1.0)

  if (error) {
    return (
      <div className="text-red-400 flex items-center justify-center h-full">
        {error}
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Skeleton className="w-32 h-32 bg-zinc-800" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-end gap-2 p-2 border-b border-border bg-muted/30 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={scale >= 3.0}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleResetZoom}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center p-4 min-h-full">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => setError(error.message)}
            loading={(
              <div className="flex items-center justify-center w-full h-32">
                <Skeleton className="w-32 h-32 bg-zinc-800" />
              </div>
            )}
            error={(
              <div className="text-red-400 flex items-center justify-center h-32">
                Failed to load PDF
              </div>
            )}
            className="flex flex-col items-center"
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                className="mb-4 shadow-lg"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={scale}
                width={600} // Base width
              />
            ))}
          </Document>
        </div>
      </ScrollArea>
    </div>
  )
}