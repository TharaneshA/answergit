import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchFileContent } from "@/lib/github";
import { logger } from '@/lib/logger';
import { generatePrompt, getRepoDataForPrompt } from '@/lib/prompt-generator';
import { RedisCacheManager } from '@/lib/redis-cache-manager';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// Define interfaces for data structures
interface ContextStats {
  files: number;
  totalChars: number;
}

interface GitIngestData {
  tree: string;
  content: string;
  success?: boolean;
  error?: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

let timeoutId: string | number | NodeJS.Timeout | undefined;

export async function POST(req: Request) {
  try {
    const { username, repo, query, filePath, fetchOnlyCurrentFile = false, history = [] } = await req.json();
    const repoKey = `${username}/${repo}`;

    // Set a longer timeout for Vercel
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    logger.info(`[${new Date().toISOString()}] Starting query processing for repository: ${repoKey}`, { prefix: 'Query' });

    let prompt = '';
    let contextStats: ContextStats = { files: 0, totalChars: 0 };

    // Start context preparation
    logger.context.start();

    // Prioritize user query by adding it to the beginning of the prompt
    const userQueryPrompt = `USER QUERY: ${query}\n\n`;

    if (filePath && fetchOnlyCurrentFile) {
      // For specific file queries, fetch only that file's content
      const fileContent = await fetchFileContent(filePath, username, repo);
      prompt = `${userQueryPrompt}You are a helpful assistant that can answer questions about the given code file.

FILE: ${filePath}

${fileContent}

Provide a detailed, technical response that directly addresses the user's query about this specific file.`;

      contextStats.files = 1;
      contextStats.totalChars = fileContent.length;
    } else {
      // For general queries, use GitIngest data
      logger.info(`Collecting repository data for ${repoKey} using GitIngest...`, { prefix: 'Query' });

      try {
        // Skip background content loading if we have cached data
        const hasCachedData = await RedisCacheManager.hasCache(username, repo);
        if (!hasCachedData) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/collect-repo-data`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, repo })
            });
          } catch (error) {
            logger.error('Error triggering background content loading: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        }

        // Get repository data from GitIngest
        let repoData: RepoData | null = null;

        // Check Redis cache first
        try {
          repoData = await RedisCacheManager.getFromCache(username, repo);
          if (repoData) {
            logger.info(`Using cached data for ${repoKey}`, { prefix: 'Context' });

            // Calculate context stats from cached data
            const treeLines = repoData.tree.split('\n');
            const contentChars = repoData.content.length;

            logger.info(`Cached Tree Structure (${treeLines.length} items):`, { prefix: 'Context' });
            // Log first 20 lines of tree to avoid spamming
            logger.info(treeLines.slice(0, 20).join('\n') + (treeLines.length > 20 ? '\n... (truncated)' : ''), { prefix: 'Context' });

            // Generate prompt using the cached data
            prompt = await generatePrompt(
              query,
              history.map((msg: ConversationMessage) => ({ role: msg.role, content: msg.content })),
              repoData.tree,
              repoData.content
            );

            contextStats.files = treeLines.length;
            contextStats.totalChars = contentChars;

            logger.info(`Generated prompt using cached data for ${repoKey}`, { prefix: 'Prompt' });
          }
        } catch (error) {
          logger.error(`Cache retrieval failed: ${error}`, { prefix: 'Context' });
        }

        if (!repoData) {
          // Existing GitIngest processing logic
          const gitIngestData: GitIngestData = await getRepoDataForPrompt(username, repo);

          if (gitIngestData && !gitIngestData.error) {
            logger.info(`Retrieved GitIngest data for repository: ${repoKey}`, { prefix: 'GitIngest' });

            // Calculate context stats from repo data
            const treeLines = gitIngestData.tree.split('\n').length;
            const contentChars = gitIngestData.content.length;

            // Generate prompt using the GitIngest data
            prompt = await generatePrompt(
              query,
              history.map((msg: ConversationMessage) => ({ role: msg.role, content: msg.content })),
              gitIngestData.tree,
              gitIngestData.content
            );

            contextStats.files = treeLines; // Approximation based on tree lines
            contextStats.totalChars = contentChars;

            logger.info(`Generated prompt for query using GitIngest data`, { prefix: 'Prompt' });
          } else {
            // Fallback if GitIngest data is not available
            logger.warn(`GitIngest data not available for ${repoKey}, using fallback prompt`, { prefix: 'GitIngest' });
            prompt = `You are a knowledgeable AI assistant with deep understanding of software development and GitHub repositories. 

Repository: ${repoKey}

${userQueryPrompt}Provide an insightful, technical response that directly addresses the user's query about this repository.`;
          }
        }
      } catch (error) {
        logger.error('Error generating prompt with GitIngest: ' + (error instanceof Error ? error.message : 'Unknown error'));
        prompt = `You are a knowledgeable AI assistant with deep understanding of software development and GitHub repositories. 

Repository: ${repoKey}

${userQueryPrompt}Provide an insightful, technical response that directly addresses the user's query about this repository.`;
      }
    }

    // After all context is prepared
    logger.context.stats(contextStats);

    // Generate response using Gemini
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      }
    });

    const response = await result.response.text();

    clearTimeout(timeoutId);
    return NextResponse.json({
      success: true,
      response
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('aborted') || errorMessage.includes('timeout');

    logger.error(`Error processing Gemini request: ${errorMessage}`);
    return NextResponse.json(
      {
        success: false,
        error: isTimeout ?
          'Request timed out. Please try with a smaller repository or specific file query.' :
          `Failed to process request: ${errorMessage}`
      },
      {
        status: isTimeout ? 504 : 500
      }
    );
  }
}

interface RepoData {
  tree: string;
  content: string;
  success?: boolean;
  error?: string;
}
