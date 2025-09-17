import * as DB from '../src/database/database';
import { StorageService } from './StorageService';

// Web Vitals metric interface
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: Date;
  url: string;
}

// Performance metric interface
interface PerformanceMetric {
  type: string;
  service: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Memory info interface
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Performance monitoring configuration
interface PerformanceConfig {
  webVitalsEnabled: boolean;
  memoryMonitoringEnabled: boolean;
  networkMonitoringEnabled: boolean;
  errorLoggingEnabled: boolean;
  samplingRate: number; // 0-1, for sampling performance data
  maxStorageDays: number;
}

class PerformanceMonitoringService {
  private config: PerformanceConfig = {
    webVitalsEnabled: true,
    memoryMonitoringEnabled: true,
    networkMonitoringEnabled: true,
    errorLoggingEnabled: true,
    samplingRate: 1.0,
    maxStorageDays: 30
  };

  private webVitalsObserver: PerformanceObserver | null = null;
  private networkObserver: PerformanceObserver | null = null;
  private isInitialized = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Initialize performance monitoring
  async initialize(config?: Partial<PerformanceConfig>): Promise<void> {
    if (this.isInitialized) return;

    // Update configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('Initializing Performance Monitoring Service...');

    try {
      // Initialize Web Vitals tracking
      if (this.config.webVitalsEnabled) {
        await this.initializeWebVitalsTracking();
      }

      // Initialize network monitoring
      if (this.config.networkMonitoringEnabled) {
        await this.initializeNetworkMonitoring();
      }

      // Initialize memory monitoring
      if (this.config.memoryMonitoringEnabled) {
        await this.initializeMemoryMonitoring();
      }

      // Initialize error logging
      if (this.config.errorLoggingEnabled) {
        await this.initializeErrorLogging();
      }

      // Start cleanup interval
      this.startCleanupInterval();

      this.isInitialized = true;
      console.log('Performance Monitoring Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Performance Monitoring Service:', error);
      throw error;
    }
  }

  // Web Vitals tracking using PerformanceObserver API
  private async initializeWebVitalsTracking(): Promise<void> {
    try {
      // Check if PerformanceObserver is supported
      if (!('PerformanceObserver' in window)) {
        console.warn('PerformanceObserver not supported in this browser');
        return;
      }

      // CLS (Cumulative Layout Shift)
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.recordWebVitalsMetric({
              name: 'CLS',
              value: (entry as any).value,
              rating: this.getCLSRating((entry as any).value),
              timestamp: new Date(),
              url: window.location.href
            });
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordWebVitalsMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: this.getLCPRating(lastEntry.startTime),
          timestamp: new Date(),
          url: window.location.href
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordWebVitalsMetric({
            name: 'FID',
            value: (entry as any).processingStart - entry.startTime,
            rating: this.getFIDRating((entry as any).processingStart - entry.startTime),
            timestamp: new Date(),
            url: window.location.href
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // FCP (First Contentful Paint) and TTFB (Time to First Byte)
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordWebVitalsMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: this.getFCPRating(entry.startTime),
              timestamp: new Date(),
              url: window.location.href
            });
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Navigation timing for TTFB
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const ttfb = navEntry.responseStart - navEntry.requestStart;
            this.recordWebVitalsMetric({
              name: 'TTFB',
              value: ttfb,
              rating: this.getTTFBRating(ttfb),
              timestamp: new Date(),
              url: window.location.href
            });
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });

      this.webVitalsObserver = clsObserver; // Keep reference for cleanup
    } catch (error) {
      console.error('Failed to initialize Web Vitals tracking:', error);
    }
  }

  // Network request monitoring
  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      if (!('PerformanceObserver' in window)) {
        console.warn('PerformanceObserver not supported for network monitoring');
        return;
      }

      const networkObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordNetworkMetric(resourceEntry);
          }
        }
      });

      networkObserver.observe({ entryTypes: ['resource'] });
      this.networkObserver = networkObserver;
    } catch (error) {
      console.error('Failed to initialize network monitoring:', error);
    }
  }

  // Memory monitoring
  private async initializeMemoryMonitoring(): Promise<void> {
    // Memory monitoring using performance.memory API (Chrome only)
    if ('memory' in window.performance) {
      setInterval(() => {
        this.recordMemoryUsage();
      }, 30000); // Every 30 seconds
    }
  }

  // Error logging
  private async initializeErrorLogging(): Promise<void> {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        level: 'error',
        message: event.message,
        stack: event.error?.stack,
        service: 'global',
        component: event.filename || 'unknown',
        url: event.filename || window.location.href,
        metadata: {
          line: event.lineno,
          column: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        service: 'promise',
        component: 'unknown',
        url: window.location.href,
        metadata: {
          reason: event.reason
        }
      });
    });
  }

  // Record Web Vitals metric
  private async recordWebVitalsMetric(metric: WebVitalsMetric): Promise<void> {
    if (Math.random() > this.config.samplingRate) return; // Sampling

    try {
      const webVitalRecord: Omit<DB.WebVitalDB, 'id'> = {
        metric: metric.name as any,
        value: metric.value,
        rating: metric.rating,
        timestamp: metric.timestamp,
        url: metric.url,
        metadata: {}
      };

      await StorageService.addWebVital(webVitalRecord);
    } catch (error) {
      console.error('Failed to record Web Vitals metric:', error);
    }
  }

  // Record network metric
  private async recordNetworkMetric(entry: PerformanceResourceTiming): Promise<void> {
    if (Math.random() > this.config.samplingRate) return;

    try {
      const networkMetric: Omit<DB.PerformanceMetricDB, 'id'> = {
        type: 'network_request',
        service: 'network',
        value: entry.duration,
        unit: 'ms',
        timestamp: new Date(),
        metadata: {
          url: entry.name,
          initiatorType: entry.initiatorType,
          transferSize: entry.transferSize,
          decodedBodySize: entry.decodedBodySize
        }
      };

      await StorageService.addPerformanceMetric(networkMetric);
    } catch (error) {
      console.error('Failed to record network metric:', error);
    }
  }

  // Record memory usage
  private async recordMemoryUsage(): Promise<void> {
    if (Math.random() > this.config.samplingRate) return;

    try {
      const memory = (window.performance as any).memory;
      if (memory) {
        const memoryMetrics = [
          {
            type: 'memory_usage',
            service: 'browser',
            value: memory.usedJSHeapSize,
            unit: 'bytes',
            timestamp: new Date(),
            metadata: { type: 'used_heap' }
          },
          {
            type: 'memory_usage',
            service: 'browser',
            value: memory.totalJSHeapSize,
            unit: 'bytes',
            timestamp: new Date(),
            metadata: { type: 'total_heap' }
          }
        ];

        for (const metric of memoryMetrics) {
          await StorageService.addPerformanceMetric(metric as Omit<DB.PerformanceMetricDB, "id">);
        }
      }
    } catch (error) {
      console.error('Failed to record memory usage:', error);
    }
  }

  // Log error
  async logError(error: {
    level: 'error' | 'warning' | 'info';
    message: string;
    stack?: string;
    service: string;
    component?: string;
    url: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const errorRecord: Omit<DB.ErrorLogDB, 'id'> = {
        level: error.level,
        message: error.message,
        stack: error.stack,
        component: error.component,
        service: error.service,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: error.url,
        metadata: error.metadata || {}
      };

      await StorageService.addErrorLog(errorRecord);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  // Record custom performance metric
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    if (Math.random() > this.config.samplingRate) return;

    try {
      const metricRecord: Omit<DB.PerformanceMetricDB, 'id'> = {
        ...(metric as any),
        timestamp: new Date()
      };

      await StorageService.addPerformanceMetric(metricRecord);
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  // Get performance metrics
  async getMetrics(options: {
    type?: string;
    service?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<DB.PerformanceMetricDB[]> {
    return await StorageService.getPerformanceMetrics(options);
  }

  // Get Web Vitals metrics
  async getWebVitals(options: {
    metric?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<DB.WebVitalDB[]> {
    return await StorageService.getWebVitals(options);
  }

  // Get error logs
  async getErrorLogs(options: {
    level?: string;
    service?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<DB.ErrorLogDB[]> {
    return await StorageService.getErrorLogs(options);
  }

  // Get performance summary
  async getPerformanceSummary(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    webVitals: Record<string, { average: number; rating: string; count: number }>;
    responseTimes: { average: number; min: number; max: number; count: number };
    errorRate: { total: number; rate: number };
    memoryUsage: { average: number; peak: number };
  }> {
    const endTime = new Date();
    const startTime = new Date();

    switch (timeRange) {
      case '1h':
        startTime.setHours(endTime.getHours() - 1);
        break;
      case '24h':
        startTime.setHours(endTime.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(endTime.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(endTime.getDate() - 30);
        break;
    }

    const [webVitals, metrics, errors] = await Promise.all([
      StorageService.getWebVitals({ startTime, endTime }),
      StorageService.getPerformanceMetrics({ startTime, endTime }),
      StorageService.getErrorLogs({ startTime, endTime })
    ]);

    // Calculate Web Vitals summary
    const webVitalsSummary: Record<string, { average: number; rating: string; count: number }> = {};
    const vitalsByMetric = webVitals.reduce((acc, vital) => {
      if (!acc[vital.metric]) acc[vital.metric] = [];
      acc[vital.metric].push(vital);
      return acc;
    }, {} as Record<string, DB.WebVitalDB[]>);

    for (const [metric, vitals] of Object.entries(vitalsByMetric)) {
      const average = vitals.reduce((sum, v) => sum + v.value, 0) / vitals.length;
      const ratings = vitals.map(v => v.rating);
      const mostCommonRating = ratings.sort((a, b) =>
        ratings.filter(r => r === a).length - ratings.filter(r => r === b).length
      ).pop() || 'unknown';

      webVitalsSummary[metric] = {
        average: Math.round(average * 100) / 100,
        rating: mostCommonRating,
        count: vitals.length
      };
    }

    // Calculate response times
    const responseTimes = metrics.filter(m => m.type === 'response_time');
    const responseTimeSummary = {
      average: responseTimes.length > 0 ? responseTimes.reduce((sum, m) => sum + m.value, 0) / responseTimes.length : 0,
      min: responseTimes.length > 0 ? Math.min(...responseTimes.map(m => m.value)) : 0,
      max: responseTimes.length > 0 ? Math.max(...responseTimes.map(m => m.value)) : 0,
      count: responseTimes.length
    };

    // Calculate error rate
    const errorCount = errors.filter(e => e.level === 'error').length;
    const totalRequests = metrics.filter(m => m.type === 'network_request').length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Calculate memory usage
    const memoryMetrics = metrics.filter(m => m.type === 'memory_usage');
    const usedMemoryMetrics = memoryMetrics.filter(m => m.metadata?.type === 'used_heap');
    const memorySummary = {
      average: usedMemoryMetrics.length > 0 ?
        usedMemoryMetrics.reduce((sum, m) => sum + m.value, 0) / usedMemoryMetrics.length : 0,
      peak: usedMemoryMetrics.length > 0 ?
        Math.max(...usedMemoryMetrics.map(m => m.value)) : 0
    };

    return {
      webVitals: webVitalsSummary,
      responseTimes: responseTimeSummary,
      errorRate: { total: errorCount, rate: Math.round(errorRate * 100) / 100 },
      memoryUsage: memorySummary
    };
  }

  // Web Vitals rating functions
  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  // Start cleanup interval for old data
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        console.error('Failed to cleanup old performance data:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  // Cleanup old performance data
  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxStorageDays);

    try {
      await Promise.all([
        StorageService.deleteOldPerformanceMetrics(cutoffDate),
        StorageService.deleteOldWebVitals(cutoffDate),
        StorageService.deleteOldErrorLogs(cutoffDate)
      ]);

      console.log(`Cleaned up performance data older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      console.error('Failed to cleanup old performance data:', error);
    }
  }

  // Cleanup and stop monitoring
  destroy(): void {
    if (this.webVitalsObserver) {
      this.webVitalsObserver.disconnect();
    }
    if (this.networkObserver) {
      this.networkObserver.disconnect();
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.isInitialized = false;
  }
}

export const performanceMonitor = new PerformanceMonitoringService();