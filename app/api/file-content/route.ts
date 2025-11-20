import { NextRequest } from "next/server";
import { Octokit } from "@octokit/rest";

// Enhanced cache for storing file contents with LRU-like behavior
const fileCache = new Map();
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes (increased from 5)
const MAX_CACHE_SIZE = 100; // Maximum number of files to cache
const MAX_CONTENT_LENGTH = 50 * 1024 * 1024; // Increased max content size to 50MB
const RETRY_ATTEMPTS = 3; // Number of retry attempts for failed requests
const RETRY_DELAY = 1000; // Delay between retries in milliseconds

// Helper function to manage cache size
function pruneCache() {
  if (fileCache.size > MAX_CACHE_SIZE) {
    // Find the oldest entries and remove them
    const entries = Array.from(fileCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20% of entries
    const entriesToRemove = Math.ceil(MAX_CACHE_SIZE * 0.2);
    entries.slice(0, entriesToRemove).forEach(([key]) => {
      fileCache.delete(key);
    });
  }
}

// Helper function to retry failed requests
async function fetchWithRetry(fn: () => Promise<any>, attempts = RETRY_ATTEMPTS): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    return fetchWithRetry(fn, attempts - 1);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");
  const username = searchParams.get("username");
  const repo = searchParams.get("repo");

  if (!path || !username || !repo) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cacheKey = `${username}/${repo}/${path}`;
  const cachedContent = fileCache.get(cacheKey);

  // Return cached content if valid
  if (cachedContent) {
    const { content, timestamp } = cachedContent;
    if (Date.now() - timestamp < CACHE_EXPIRY) {
      // Update timestamp to implement LRU-like behavior
      fileCache.set(cacheKey, {
        content,
        timestamp: Date.now(), // Update access time
      });

      return new Response(JSON.stringify(content), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600", // Allow browser caching for 10 minutes
        },
      });
    }
    fileCache.delete(cacheKey); // Clear expired cache
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: {
        timeout: 15000, // 15 second timeout (increased from 10)
      },
    });

    // Use fetchWithRetry for better reliability
    const response = await fetchWithRetry(async () => {
      return await Promise.race([
        octokit.repos.getContent({
          owner: username,
          repo: repo,
          path: path,
          // Request raw format for better performance with text files
          mediaType: {
            format: path.endsWith('.md') ? 'raw' : 'json',
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        ),
      ]);
    }) as Awaited<ReturnType<typeof octokit.repos.getContent>>;

    let content: string;

    // Handle raw format response (especially for markdown files)
    if (response && 'data' in response && typeof response.data === 'string') {
      content = response.data;
    }
    // Handle JSON format response
    else if (
      response &&
      'data' in response &&
      response.data &&
      !Array.isArray(response.data) &&
      typeof response.data === 'object' &&
      'content' in response.data &&
      typeof response.data.content === 'string'
    ) {
      // Check if file is binary (images, PDFs, etc.)
      const extension = path.split('.').pop()?.toLowerCase() || '';
      const isBinaryFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'pdf'].includes(extension);

      if (isBinaryFile) {
        // For binary files, keep the base64 encoding
        content = response.data.content;
      } else {
        // For text files, decode from base64
        content = Buffer.from(response.data.content, "base64").toString();
      }
    } else {
      return new Response(JSON.stringify({ error: "Invalid response format or path points to a directory" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Limit content size to prevent memory issues
    const trimmedContent = content.length > MAX_CONTENT_LENGTH
      ? content.slice(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated due to size limitations]"
      : content;

    // Cache the content
    fileCache.set(cacheKey, {
      content: trimmedContent,
      timestamp: Date.now(),
    });

    // Prune cache if it exceeds size limit
    pruneCache();

    return new Response(JSON.stringify(trimmedContent), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600", // Allow browser caching
      },
    });
  } catch (error) {
    console.error("Error fetching file content:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to fetch file content";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = "Request timed out while fetching file content";
      } else if (error.message.includes('rate limit')) {
        errorMessage = "GitHub API rate limit exceeded. Please try again later.";
        statusCode = 429;
      } else if (error.message.includes('Not Found')) {
        errorMessage = `File '${path}' not found in repository ${username}/${repo}`;
        statusCode = 404;
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}