"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export function EnhancedLoading({ className, loadingText }: { className?: string; loadingText?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4 p-8", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm text-muted-foreground animate-pulse">
        {loadingText?.replace(/GitIngest/i, "analysis") || "Analyzing repository..."}
      </p>
    </div>
  )
}
