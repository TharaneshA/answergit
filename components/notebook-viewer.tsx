'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { ScrollBar } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

interface NotebookViewerProps {
  notebookData: string
}

interface NotebookCell {
  cell_type: 'code' | 'markdown'
  source: string[] | string
  outputs?: Array<{
    output_type: string
    text?: string[]
    data?: {
      'text/plain'?: string[]
      'text/html'?: string[]
    }
  }>
}

interface IPythonNotebook {
  cells: NotebookCell[]
  metadata: any
  nbformat: number
  nbformat_minor: number
}

export default function NotebookViewer({ notebookData }: NotebookViewerProps) {
  const [error, setError] = useState<string | null>(null)
  const [notebook, setNotebook] = useState<IPythonNotebook | null>(null)

  useEffect(() => {
    const parseNotebook = (data: string): IPythonNotebook | null => {
      try {
        // Initial data validation
        if (!data || typeof data !== 'string') {
          throw new Error('Invalid input: Notebook data must be a non-empty string')
        }

        // Check for truncation
        if (data.includes('[Content truncated due to size limitations]')) {
          throw new Error('Notebook content is too large and has been truncated. Unable to render.')
        }

        let parsed;
        try {
          parsed = JSON.parse(data)
        } catch (e) {
          console.error('JSON parse error:', e)
          throw new Error('Failed to parse notebook JSON. The file may be corrupted or invalid.')
        }

        // Validate required notebook properties
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid notebook format: Must be a JSON object')
        }

        if (!Array.isArray(parsed.cells)) {
          throw new Error('Invalid notebook format: Missing cells array')
        }

        // Validate cell structure
        for (const cell of parsed.cells) {
          if (!cell.cell_type || (!Array.isArray(cell.source) && typeof cell.source !== 'string')) {
            console.warn('Invalid cell found:', cell)
          }
        }

        return parsed
      } catch (e) {
        console.error('Notebook parsing error:', e)
        setError(
          e instanceof Error ? e.message : 'Failed to parse notebook'
        )
        return null
      }
    }

    setNotebook(parseNotebook(notebookData))
  }, [notebookData])

  if (error) {
    return (
      <div className="text-red-400 flex items-center justify-center h-full p-4 text-center">
        {error}
      </div>
    )
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Skeleton className="w-32 h-32 bg-zinc-800" />
      </div>
    )
  }

  return (
    <ScrollAreaPrimitive.Root className="relative h-full w-full overflow-hidden">
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        <div className="flex flex-col gap-4 p-4 min-w-max">
          {notebook.cells.map((cell, index) => (
            <Card key={index} className="p-4 overflow-hidden bg-zinc-900 border-zinc-800 max-w-[calc(100vw-2rem)] md:max-w-none">
              {cell.cell_type === 'markdown' ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                    {Array.isArray(cell.source) ? cell.source.join('') : cell.source}
                  </ReactMarkdown>
                </div>
              ) : cell.cell_type === 'code' ? (
                <div className="flex flex-col gap-2">
                  <div className="bg-zinc-950 p-3 rounded-md overflow-x-auto">
                    <pre className="font-mono text-sm text-zinc-300">
                      <code>{Array.isArray(cell.source) ? cell.source.join('') : cell.source}</code>
                    </pre>
                  </div>
                  {cell.outputs && cell.outputs.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {cell.outputs.map((output, outIndex) => {
                        // Handle stream output (stdout/stderr)
                        if (output.output_type === 'stream' && output.text) {
                          return (
                            <pre key={outIndex} className="font-mono text-sm text-zinc-400 whitespace-pre-wrap">
                              {Array.isArray(output.text) ? output.text.join('') : output.text}
                            </pre>
                          )
                        }
                        // Handle execute_result or display_data
                        if ((output.output_type === 'execute_result' || output.output_type === 'display_data') && output.data) {
                          if (output.data['text/html']) {
                            return (
                              <div
                                key={outIndex}
                                className="prose prose-invert max-w-none overflow-x-auto bg-white/5 p-2 rounded"
                                dangerouslySetInnerHTML={{
                                  __html: Array.isArray(output.data['text/html'])
                                    ? output.data['text/html'].join('')
                                    : output.data['text/html'] || ''
                                }}
                              />
                            )
                          }
                          if (output.data['text/plain']) {
                            return (
                              <pre key={outIndex} className="font-mono text-sm text-zinc-400 whitespace-pre-wrap">
                                {Array.isArray(output.data['text/plain'])
                                  ? output.data['text/plain'].join('')
                                  : output.data['text/plain']}
                              </pre>
                            )
                          }
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" className="top-0 bottom-auto border-b border-zinc-800/50" />
      <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}