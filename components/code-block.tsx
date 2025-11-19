"use client"

import { Check, Copy, Terminal } from "lucide-react"
import { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

interface CodeBlockProps {
    language: string
    value: string
}

export function CodeBlock({ language, value }: CodeBlockProps) {
    const [isCopied, setIsCopied] = useState(false)

    const copyToClipboard = async () => {
        if (!value) return
        await navigator.clipboard.writeText(value)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="relative w-full max-w-full rounded-lg overflow-hidden border border-zinc-700 bg-[#282a36] my-4">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-700">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Terminal className="h-4 w-4" />
                    <span className="text-xs font-mono uppercase">{language || "CODE"}</span>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    {isCopied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className="relative overflow-x-auto">
                <SyntaxHighlighter
                    language={language}
                    style={dracula}
                    customStyle={{
                        margin: 0,
                        padding: "1.5rem",
                        background: "transparent",
                        fontSize: "0.9rem",
                        lineHeight: "1.5",
                        whiteSpace: "pre", // Changed from pre-wrap to pre
                        wordBreak: "normal", // Changed from break-word to normal
                    }}
                    wrapLines={false}
                    wrapLongLines={false}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    )
}
