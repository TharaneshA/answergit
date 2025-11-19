import { Suspense } from "react"
import FileExplorer from "@/components/file-explorer"
import AiAssistant from "@/components/ai-assistant"
import FileViewer from "@/components/file-viewer"
import RepoAnalyzer from "@/components/repo-analyzer"
import RepoLayout from "@/components/repo-layout"
import { fetchRepoData } from "@/lib/github"
import { Skeleton } from "@/components/ui/skeleton"
import { Metadata } from "next"
import { notFound, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RepoPageProps {
  params: Promise<{
    username: string
    repo: string
  }>
}

export async function generateMetadata({ params }: RepoPageProps): Promise<Metadata> {
  const { username, repo } = await params
  return {
    title: `${username}/${repo} - AnswersForGit`,
    description: `AI-powered code exploration for ${username}/${repo}`,
  }
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { username, repo } = await params

  try {
    // Fetch repository data first
    const repoData = await fetchRepoData(username, repo)
    if (!repoData) {
      throw new Error(`Repository ${username}/${repo} not found or inaccessible`)
    }

    return (
      <RepoLayout repoData={repoData} username={username} repo={repo} />
    )
  } catch (error) {
    notFound()
  }
}

