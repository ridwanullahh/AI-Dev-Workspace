import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../services/performanceMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  rating?: 'good' | 'needs-improvement' | 'poor';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  rating,
  description
}) => {
  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", rating && getRatingColor(rating))}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            {change > 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel || 'from last period'}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

// Simple Chart Component (Canvas-based for better performance)
interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    borderColor?: string;
  }>;
}

const SimpleChart: React.FC<{
  data: ChartData;
  type: 'line' | 'bar';
  height?: number;
  className?: string;
}> = ({ data, type, height = 200, className }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Calculate scales
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    const minValue = Math.min(...data.datasets.flatMap(d => d.data));
    const range = maxValue - minValue || 1;

    const xScale = chartWidth / (data.labels.length - 1 || 1);
    const yScale = chartHeight / range;

    // Draw grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i < data.labels.length; i++) {
      const x = padding + i * xScale;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw data
    data.datasets.forEach((dataset, datasetIndex) => {
      ctx.strokeStyle = dataset.borderColor || dataset.color;
      ctx.fillStyle = dataset.color;
      ctx.lineWidth = 2;

      if (type === 'line') {
        ctx.beginPath();
        data.labels.forEach((_, i) => {
          const x = padding + i * xScale;
          const value = dataset.data[i] || 0;
          const y = height - padding - ((value - minValue) * yScale);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      } else if (type === 'bar') {
        const barWidth = xScale * 0.8 / data.datasets.length;
        const barOffset = datasetIndex * barWidth;

        data.labels.forEach((_, i) => {
          const x = padding + i * xScale - (xScale * 0.4) + barOffset;
          const value = dataset.data[i] || 0;
          const barHeight = ((value - minValue) * yScale);
          const y = height - padding - barHeight;

          ctx.fillRect(x, y, barWidth, barHeight);
        });
      }
    });

    // Draw axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

  }, [data, type]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={height}
      className={cn("w-full", className)}
    />
  );
};

// Web Vitals Display Component
const WebVitalsCard: React.FC<{ vitals: Record<string, any> }> = ({ vitals }) => {
  const getVitalsDescription = (metric: string) => {
    const descriptions: Record<string, string> = {
      CLS: 'Measures visual stability - lower is better',
      FID: 'Measures interactivity - lower is better',
      LCP: 'Measures loading performance - lower is better',
      FCP: 'Measures paint performance - lower is better',
      TTFB: 'Measures server response time - lower is better'
    };
    return descriptions[metric] || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Web Vitals
        </CardTitle>
        <CardDescription>Core Web Vitals performance metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(vitals).map(([metric, data]: [string, any]) => (
          <div key={metric} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <div className="font-medium">{metric}</div>
              <div className="text-sm text-muted-foreground">
                {getVitalsDescription(metric)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {data.average?.toFixed(2) || 'N/A'}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {metric === 'CLS' ? '' : 'ms'}
                </span>
              </div>
              <Badge variant={
                data.rating === 'good' ? 'default' :
                data.rating === 'needs-improvement' ? 'secondary' : 'destructive'
              }>
                {data.rating || 'unknown'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Main Performance Dashboard Component
const PerformanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const data = await performanceMonitor.getPerformanceSummary(timeRange);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [timeRange]);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor application performance metrics and Web Vitals
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-muted-foreground">
        Last updated: {lastUpdated.toLocaleString()}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Avg Response Time"
              value={summary?.responseTimes?.average?.toFixed(0) || 'N/A'}
              unit="ms"
              icon={<Activity className="h-4 w-4" />}
              description="Average API response time"
            />
            <MetricCard
              title="Memory Usage"
              value={summary?.memoryUsage?.average ?
                (summary.memoryUsage.average / 1024 / 1024).toFixed(1) : 'N/A'}
              unit="MB"
              icon={<HardDrive className="h-4 w-4" />}
              description="Current memory consumption"
            />
            <MetricCard
              title="Error Rate"
              value={summary?.errorRate?.rate?.toFixed(1) || '0'}
              unit="%"
              icon={<AlertTriangle className="h-4 w-4" />}
              description="Percentage of failed requests"
            />
            <MetricCard
              title="Total Requests"
              value={summary?.responseTimes?.count || 0}
              icon={<BarChart3 className="h-4 w-4" />}
              description="Total requests in time period"
            />
          </div>

          {/* Web Vitals Summary */}
          {summary?.webVitals && Object.keys(summary.webVitals).length > 0 && (
            <WebVitalsCard vitals={summary.webVitals} />
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Response Time Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleChart
                  data={{
                    labels: summary?.responseTimes?.history.map((h: any) => new Date(h.time).toLocaleTimeString()) || [],
                    datasets: [
                      {
                        label: 'Response Time',
                        data: summary?.responseTimes?.history.map((h: any) => h.value) || [],
                        color: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                      },
                    ],
                  }}
                  type="line"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Memory Usage Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleChart
                  data={{
                    labels: summary?.memoryUsage?.history.map((h: any) => new Date(h.time).toLocaleTimeString()) || [],
                    datasets: [
                      {
                        label: 'Memory Usage',
                        data: summary?.memoryUsage?.history.map((h: any) => h.value / 1024 / 1024) || [],
                        color: 'rgba(139, 92, 246, 0.5)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                      },
                    ],
                  }}
                  type="line"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="web-vitals" className="space-y-6">
          {summary?.webVitals && Object.keys(summary.webVitals).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(summary.webVitals).map(([metric, data]: [string, any]) => (
                <Card key={metric}>
                  <CardHeader>
                    <CardTitle className="text-lg">{metric}</CardTitle>
                    <CardDescription>
                      {metric === 'CLS' && 'Cumulative Layout Shift'}
                      {metric === 'FID' && 'First Input Delay'}
                      {metric === 'LCP' && 'Largest Contentful Paint'}
                      {metric === 'FCP' && 'First Contentful Paint'}
                      {metric === 'TTFB' && 'Time to First Byte'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average</span>
                        <span className="font-semibold">
                          {data.average?.toFixed(2) || 'N/A'}
                          {metric !== 'CLS' && <span className="text-sm">ms</span>}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Rating</span>
                        <Badge variant={
                          data.rating === 'good' ? 'default' :
                          data.rating === 'needs-improvement' ? 'secondary' : 'destructive'
                        }>
                          {data.rating || 'unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Samples</span>
                        <span className="font-semibold">{data.count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Web Vitals Data</h3>
              <p className="text-muted-foreground">
                Web Vitals data will appear here once the application starts collecting metrics.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Detailed performance analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Detailed performance charts coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Logs
              </CardTitle>
              <CardDescription>Application errors and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Error logs will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;