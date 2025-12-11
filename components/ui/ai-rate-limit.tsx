'use client';

import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { Sparkles } from 'lucide-react';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

export function AIRateLimit() {
  const [rateLimit, setRateLimit] = React.useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { theme } = useTheme();

  const fetchRateLimit = async () => {
    try {
      const response = await fetch('/api/rate-limit');
      const data = await response.json();

      if (data.success) {
        setRateLimit({
          remaining: data.remaining,
          limit: data.limit,
          resetAt: data.resetAt,
        });
      } else {
        setRateLimit(null);
      }
    } catch (error) {
      console.error('Error fetching AI rate limit:', error);
      setRateLimit(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRateLimit();
    // Update rate limit every 30 seconds
    const interval = setInterval(fetchRateLimit, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for custom events to update rate limit after AI responses
  React.useEffect(() => {
    const handleRateLimitUpdate = (event: CustomEvent<RateLimitInfo>) => {
      setRateLimit(event.detail);
    };

    window.addEventListener('aiRateLimitUpdate', handleRateLimitUpdate as EventListener);
    return () => {
      window.removeEventListener('aiRateLimitUpdate', handleRateLimitUpdate as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">...</span>
      </div>
    );
  }

  if (!rateLimit) {
    return null;
  }

  const percentage = (rateLimit.remaining / rateLimit.limit) * 100;
  const resetTime = new Date(rateLimit.resetAt * 1000).toLocaleTimeString();
  const isLow = rateLimit.remaining <= 5;
  const isEmpty = rateLimit.remaining === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${isEmpty ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-emerald-500'}`} />
            <div className="w-16 flex items-center gap-1.5">
              <span className={`text-xs font-medium ${isEmpty ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-foreground'}`}>
                {rateLimit.remaining}
              </span>
              <Progress
                value={percentage}
                className="h-1.5 w-full"
                indicatorClassName={`${
                  isEmpty
                    ? 'bg-red-500'
                    : isLow
                      ? 'bg-yellow-500'
                      : theme === 'dark'
                        ? 'bg-emerald-500'
                        : 'bg-emerald-600'
                } transition-all`}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">{rateLimit.remaining}/{rateLimit.limit} AI requests remaining</p>
            <p className="text-muted-foreground">Resets at {resetTime}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
