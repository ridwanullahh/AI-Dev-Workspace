import React, { useState, useEffect } from 'react';
import { db } from '@/database/schema';
import {
  Activity,
  TrendingUp,
  DollarSign,
  Zap,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsageStats {
  provider: string;
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  requestsByDay: { date: string; count: number }[];
  tokensByModel: { model: string; tokens: number }[];
}

export function AIUsageDashboard() {
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsageStats();
  }, [timeRange]);

  const loadUsageStats = async () => {
    try {
      setIsLoading(true);

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (timeRange === 'day') {
        startDate.setDate(now.getDate() - 1);
      } else if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Get messages in range
      const messages = await db.chats
        .where('timestamp')
        .between(startDate, now)
        .toArray();

      // Group by provider
      const providerStats = new Map<string, UsageStats>();

      messages.forEach(msg => {
        if (msg.role !== 'assistant' || !msg.metadata?.provider) return;

        const provider = msg.metadata.provider;
        const tokens = msg.metadata.tokens || 0;
        const model = msg.metadata.model || 'unknown';

        if (!providerStats.has(provider)) {
          providerStats.set(provider, {
            provider,
            totalRequests: 0,
            totalTokens: 0,
            estimatedCost: 0,
            requestsByDay: [],
            tokensByModel: []
          });
        }

        const stats = providerStats.get(provider)!;
        stats.totalRequests++;
        stats.totalTokens += tokens;
        
        // Estimate cost (rough calculation)
        const costPerToken = model.includes('gpt-4') ? 0.00003 : 0.000001;
        stats.estimatedCost += tokens * costPerToken;
      });

      setStats(Array.from(providerStats.values()));
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRequests = stats.reduce((sum, s) => sum + s.totalRequests, 0);
  const totalTokens = stats.reduce((sum, s) => sum + s.totalTokens, 0);
  const totalCost = stats.reduce((sum, s) => sum + s.estimatedCost, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Usage Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Monitor your AI API usage and costs
          </p>
        </div>

        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="day">24h</TabsTrigger>
            <TabsTrigger value="week">7d</TabsTrigger>
            <TabsTrigger value="month">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Requests</span>
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{totalRequests.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all providers
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Tokens</span>
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold">{(totalTokens / 1000).toFixed(1)}K</div>
          <p className="text-xs text-muted-foreground mt-1">
            Input + output combined
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Estimated Cost</span>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold">${totalCost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on current pricing
          </p>
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage by Provider
        </h3>

        {stats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No usage data for this time period
          </div>
        ) : (
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{stat.provider}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {stat.totalRequests} requests
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    ${stat.estimatedCost.toFixed(4)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${(stat.totalTokens / totalTokens) * 100}%`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{(stat.totalTokens / 1000).toFixed(1)}K tokens</span>
                  <span>{((stat.totalTokens / totalTokens) * 100).toFixed(1)}% of total</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost Alert */}
      {totalCost > 5 && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-500 mb-1">High Usage Alert</h4>
            <p className="text-sm text-yellow-200">
              Your estimated costs have exceeded $5 for this period. Consider reviewing your API usage or setting up rate limits.
            </p>
          </div>
        </div>
      )}

      {/* Rate Limit Status */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rate Limits
        </h3>
        
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.provider} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{stat.provider}</p>
                <p className="text-xs text-muted-foreground">
                  {stat.totalRequests} / 1000 requests per hour
                </p>
              </div>
              <Badge variant={stat.totalRequests > 800 ? 'destructive' : 'secondary'}>
                {((stat.totalRequests / 1000) * 100).toFixed(0)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
