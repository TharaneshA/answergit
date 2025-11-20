import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { RedisCacheManager } from '@/lib/redis-cache-manager';

export async function POST(req: NextRequest) {
    try {
        const { username, repo, force_refresh = false } = await req.json();
        const repoUrl = `https://github.com/${username}/${repo}`;
        const apiUrl = process.env.GITINGEST_API_URL;

        if (!apiUrl) {
            return NextResponse.json({ success: false, error: "GITINGEST_API_URL not set in environment." }, { status: 500 });
        }

        // Check cache first unless force refresh is requested
        if (!force_refresh) {
            const cachedData = await RedisCacheManager.getFromCache(username, repo);
            if (cachedData) {
                logger.info(`Retrieved data from cache for ${repoUrl}`, { prefix: 'GitIngest' });
                return NextResponse.json(cachedData);
            }
        }

        logger.info(`Starting data collection for repository: ${repoUrl} using GitIngest`, { prefix: 'GitIngest' });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 120 second timeout

        const response = await fetch(`${apiUrl}/ingest/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ github_link: repoUrl }),
            signal: controller.signal
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
                throw new Error(errorJson.detail || `API request failed with status ${response.status}`);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    // Handle malformed JSON response
                    logger.error(`Malformed JSON response from GitIngest API: ${errorText}`, { prefix: 'GitIngest' });
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Invalid response from analysis service. Please try again later.'
                        },
                        { status: 500 }
                    );
                }
                throw e;
            }
        }

        const result = await response.json();
        // Extract and log essential metrics
        const metrics = {
            files: result.summary?.match(/Files analyzed: (\d+)/)?.at(1) || 0,
            tokens: result.summary?.match(/Estimated tokens: (\d+)/)?.at(1) || 0,
            chars: result.content?.length || 0
        };

        logger.info(`Repository metrics - Files: ${metrics.files}, Tokens: ${metrics.tokens}, Characters: ${metrics.chars}`, { prefix: 'GitIngest' });

        if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format from GitIngest');
        }

        let data;

        if (result.data && typeof result.data === 'object') {
            data = result.data;
        } else if (result.summary && result.tree && result.content) {
            data = result;
        } else {
            throw new Error('GitIngest response missing required data fields');
        }

        if (!data.summary || !data.tree || !data.content) {
            logger.warn('Some GitIngest fields may be missing, but proceeding with available data', { prefix: 'GitIngest' });
        }

        if (result.success === false) {
            let errorMessage = result.error || 'Unknown error from GitIngest';
            if (result.error === 'error:repo_not_found') {
                logger.warn(`Repository not found: ${repoUrl}`, { prefix: 'GitIngest' });
                errorMessage = `Repository not found: ${repoUrl}. Please verify the username and repository name.`;
                return NextResponse.json(
                    {
                        success: false,
                        error: errorMessage
                    },
                    { status: 404 }
                );
            } else if (result.error === 'error:repo_too_large') {
                logger.warn(`Repository too large: ${repoUrl}`, { prefix: 'GitIngest' });
                errorMessage = `Repository ${repoUrl} is too large to process. Please try a smaller repository.`;
                return NextResponse.json(
                    {
                        success: false,
                        error: errorMessage
                    },
                    { status: 413 }
                );

            } else if (result.error === 'error:repo_private') {
                logger.warn(`Repository is private or rate limited: ${repoUrl}`, { prefix: 'GitIngest' });
                errorMessage = `Repository ${repoUrl} is private or GitHub API rate limit exceeded. Please try again later.`;
                return NextResponse.json(
                    {
                        success: false,
                        error: errorMessage
                    },
                    { status: 403 }
                );
            }
            throw new Error(errorMessage);
        }

        if (!data.files) {
            data.files = [];
        }

        // Save successful response to cache
        await RedisCacheManager.saveToCache(username, repo, data);

        return NextResponse.json({
            success: true,
            data: {
                ...result,
                success: true
            }
        });
    } catch (error) {
        logger.error('Error collecting repository data: ' + (error instanceof Error ? error.message : 'Unknown error'), { prefix: 'GitIngest' });
        return NextResponse.json(
            {
                success: false,
                error: `Failed to collect repository data: ${error instanceof Error ? error.message : 'Unknown error'}`
            },
            { status: 500 }
        );
    }
}
