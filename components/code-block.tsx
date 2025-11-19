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
        <div className="relative w-full max-w-full grid rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm bg-zinc-900 dark:bg-[#282a36] my-4">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Terminal className="h-4 w-4" />
                    <span className="text-xs font-mono uppercase">{language || "CODE"}</span>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
            <div className="relative overflow-x-scroll [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-zinc-100/5 dark:[&::-webkit-scrollbar-track]:bg-zinc-800/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-500">
                <SyntaxHighlighter
                    language={language}
                    style={dracula}
                    customStyle={{
                        margin: 0,
                        padding: "1.5rem",
                        paddingRight: "2.5rem",
                        background: "transparent",
                        fontSize: "0.9rem",
                        lineHeight: "1.5",
                        whiteSpace: "pre",
                        wordBreak: "normal",
                    }}
                    wrapLines={false}
                    wrapLongLines={false}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
            {/* Scroll Hint Overlay - Shadow falling from right to inside */}
            <div className="absolute right-0 top-10 bottom-2.5 w-8 bg-gradient-to-l from-zinc-900/80 to-transparent pointer-events-none dark:from-[#282a36]/80" />
        </div>
    )
}
