import { db } from '../database/schema';
import type { Performance as PerformanceRecord } from '../database/schema';

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export class PerformanceMonitoringService {
  private observer: PerformanceObserver | null = null;
  private metrics: Map<string, number> = new Map();
  private batteryAPI: any = null;
  private isMonitoring = false;

  async initialize(): Promise<void> {
    if (this.isMonitoring) return;

    // Initialize Web Vitals monitoring
    this.initializeWebVitals();
    
    // Initialize battery monitoring
    await this.initializeBatteryMonitoring();
    
    // Initialize memory monitoring
    this.initializeMemoryMonitoring();
    
    this.isMonitoring = true;
  }

  private initializeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    // Observe paint metrics
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.handlePerformanceEntry(entry);
      }
    });

    try {
      this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      console.warn('Performance Observer not fully supported:', error);
    }

    // Manual FCP/LCP measurement fallback
    this.measurePaintMetrics();
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.batteryAPI = await (navigator as any).getBattery();
        this.batteryAPI.addEventListener('levelchange', () => this.recordBatteryMetrics());
        this.batteryAPI.addEventListener('chargingchange', () => this.recordBatteryMetrics());
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  private initializeMemoryMonitoring(): void {
    // Monitor memory usage periodically
    setInterval(() => {
      this.recordMemoryMetrics();
    }, 30000); // Every 30 seconds
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        this.handlePaintEntry(entry);
        break;
      case 'largest-contentful-paint':
        this.handleLCPEntry(entry);
        break;
      case 'first-input':
        this.handleFIDEntry(entry as any);
        break;
      case 'layout-shift':
        this.handleCLSEntry(entry as any);
        break;
    }
  }

  private handlePaintEntry(entry: PerformanceEntry): void {
    if (entry.name === 'first-contentful-paint') {
      this.metrics.set('fcp', entry.startTime);
      this.recordMetric('load', 'fcp', entry.startTime);
    }
  }

  private handleLCPEntry(entry: any): void {
    this.metrics.set('lcp', entry.startTime);
    this.recordMetric('load', 'lcp', entry.startTime);
  }

  private handleFIDEntry(entry: any): void {
    this.metrics.set('fid', entry.processingStart - entry.startTime);
    this.recordMetric('ui', 'fid', entry.processingStart - entry.startTime);
  }

  private handleCLSEntry(entry: any): void {
    if (!entry.hadRecentInput) {
      const currentCLS = this.metrics.get('cls') || 0;
      this.metrics.set('cls', currentCLS + entry.value);
      this.recordMetric('ui', 'cls', currentCLS + entry.value);
    }
  }

  private measurePaintMetrics(): void {
    // Fallback measurement using navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        const loadComplete = navigation.loadEventEnd - navigation.fetchStart;

        this.metrics.set('ttfb', ttfb);
        this.metrics.set('domContentLoaded', domContentLoaded);
        this.metrics.set('loadComplete', loadComplete);

        this.recordMetric('load', 'ttfb', ttfb);
        this.recordMetric('load', 'domContentLoaded', domContentLoaded);
        this.recordMetric('load', 'loadComplete', loadComplete);
      }
    });
  }

  private async recordMetric(category: any, metric: string, value: number): Promise<void> {
    const record: PerformanceRecord = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: category as any,
      metric,
      value,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      },
      timestamp: new Date()
    };

    await db.performance.add(record);
  }

  private recordBatteryMetrics(): void {
    if (!this.batteryAPI) return;

    this.recordMetric('battery' as any, 'level', this.batteryAPI.level * 100);
    this.recordMetric('battery' as any, 'charging', this.batteryAPI.charging ? 1 : 0);
  }

  private recordMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory', 'usedJSHeapSize', memory.usedJSHeapSize / 1024 / 1024); // MB
      this.recordMetric('memory', 'totalJSHeapSize', memory.totalJSHeapSize / 1024 / 1024); // MB
    }
  }

  // AI Performance Monitoring
  async recordAIMetrics(provider: string, model: string, metrics: {
    responseTime: number;
    tokens: number;
    cost: number;
    success: boolean;
  }): Promise<void> {
    await this.recordMetric('ai', 'responseTime', metrics.responseTime);
    await this.recordMetric('ai', 'tokens', metrics.tokens);
    await this.recordMetric('ai', 'cost', metrics.cost);
    await this.recordMetric('ai', 'success', metrics.success ? 1 : 0);

    // Store detailed AI metrics
    await db.performance.add({
      id: `ai_perf_${Date.now()}`,
      category: 'ai',
      metric: 'request',
      value: metrics.responseTime,
      metadata: {
        provider,
        model,
        tokens: metrics.tokens,
        cost: metrics.cost,
        success: metrics.success,
        timestamp: Date.now()
      },
      timestamp: new Date()
    });
  }

  // Git Performance Monitoring
  async recordGitMetrics(operation: string, duration: number, success: boolean): Promise<void> {
    await this.recordMetric('git', operation, duration);
    await this.recordMetric('git', `${operation}_success`, success ? 1 : 0);
  }

  // Performance Analytics
  async getMetrics(category?: string, timeRange?: { start: Date; end: Date }): Promise<PerformanceRecord[]> {
    let query = db.performance.orderBy('timestamp').reverse();

    if (category) {
      query = db.performance.where('category').equals(category).reverse();
    }

    const records = await query.toArray();

    if (timeRange) {
      return records.filter(record => 
        record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    return records.slice(0, 1000); // Limit to last 1000 records
  }

  async getPerformanceSummary(timeRange?: { start: Date; end: Date }): Promise<{
    webVitals: PerformanceMetrics;
    aiMetrics: { avgResponseTime: number; totalRequests: number; successRate: number };
    gitMetrics: { avgOperationTime: number; totalOperations: number; successRate: number };
    batteryUsage: { avgLevel: number; chargingTime: number };
    memoryUsage: { avgUsed: number; maxUsed: number };
  }> {
    const records = await this.getMetrics(undefined, timeRange);

    return {
      webVitals: this.calculateWebVitals(records),
      aiMetrics: this.calculateAIMetrics(records),
      gitMetrics: this.calculateGitMetrics(records),
      batteryUsage: this.calculateBatteryUsage(records),
      memoryUsage: this.calculateMemoryUsage(records)
    };
  }

  private calculateWebVitals(records: PerformanceRecord[]): PerformanceMetrics {
    const webVitalRecords = records.filter(r => ['load', 'ui'].includes(r.category));
    
    return {
      fcp: this.getLatestMetric(webVitalRecords, 'fcp') || 0,
      lcp: this.getLatestMetric(webVitalRecords, 'lcp') || 0,
      fid: this.getLatestMetric(webVitalRecords, 'fid') || 0,
      cls: this.getLatestMetric(webVitalRecords, 'cls') || 0,
      ttfb: this.getLatestMetric(webVitalRecords, 'ttfb') || 0,
      tti: this.getLatestMetric(webVitalRecords, 'tti') || 0
    };
  }

  private calculateAIMetrics(records: PerformanceRecord[]) {
    const aiRecords = records.filter(r => r.category === 'ai');
    const responseTimes = aiRecords.filter(r => r.metric === 'responseTime').map(r => r.value);
    const successRecords = aiRecords.filter(r => r.metric === 'success');

    return {
      avgResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length 
        : 0,
      totalRequests: responseTimes.length,
      successRate: successRecords.length > 0
        ? successRecords.filter(r => r.value === 1).length / successRecords.length
        : 1
    };
  }

  private calculateGitMetrics(records: PerformanceRecord[]) {
    const gitRecords = records.filter(r => r.category === 'git');
    const operationTimes = gitRecords.filter(r => !r.metric.includes('_success')).map(r => r.value);
    const successRecords = gitRecords.filter(r => r.metric.includes('_success'));

    return {
      avgOperationTime: operationTimes.length > 0
        ? operationTimes.reduce((sum, val) => sum + val, 0) / operationTimes.length
        : 0,
      totalOperations: operationTimes.length,
      successRate: successRecords.length > 0
        ? successRecords.filter(r => r.value === 1).length / successRecords.length
        : 1
    };
  }

  private calculateBatteryUsage(records: PerformanceRecord[]) {
    const batteryRecords = records.filter(r => r.category === 'battery' as any);
    const levelRecords = batteryRecords.filter(r => r.metric === 'level').map(r => r.value);

    return {
      avgLevel: levelRecords.length > 0
        ? levelRecords.reduce((sum, val) => sum + val, 0) / levelRecords.length
        : 100,
      chargingTime: 0 // Would calculate based on charging events
    };
  }

  private calculateMemoryUsage(records: PerformanceRecord[]) {
    const memoryRecords = records.filter(r => r.category === 'memory' && r.metric === 'usedJSHeapSize');
    const memoryValues = memoryRecords.map(r => r.value);

    return {
      avgUsed: memoryValues.length > 0
        ? memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length
        : 0,
      maxUsed: memoryValues.length > 0 ? Math.max(...memoryValues) : 0
    };
  }

  private getLatestMetric(records: PerformanceRecord[], metric: string): number | null {
    const metricRecords = records.filter(r => r.metric === metric);
    return metricRecords.length > 0 ? metricRecords[0].value : null;
  }

  // Performance Budgets
  async checkPerformanceBudget(): Promise<{
    passed: boolean;
    violations: Array<{ metric: string; actual: number; budget: number }>;
  }> {
    const budgets = {
      fcp: 3000, // 3 seconds on 3G
      lcp: 4000, // 4 seconds
      fid: 100,  // 100ms
      cls: 0.1,  // 0.1 CLS score
      aiResponseTime: 2000, // 2 seconds
      memoryUsage: 100 // 100MB
    };

    const current = await this.getCurrentMetrics();
    const violations: Array<{ metric: string; actual: number; budget: number }> = [];

    for (const [metric, budget] of Object.entries(budgets)) {
      const actual = current[metric] || 0;
      if (actual > budget) {
        violations.push({ metric, actual, budget });
      }
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  private async getCurrentMetrics(): Promise<Record<string, number>> {
    const recentRecords = await this.getMetrics(undefined, {
      start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      end: new Date()
    });

    const metrics: Record<string, number> = {};
    
    // Get latest value for each metric
    const metricGroups = recentRecords.reduce((groups, record) => {
      const key = `${record.category}_${record.metric}`;
      if (!groups[key] || record.timestamp > groups[key].timestamp) {
        groups[key] = record;
      }
      return groups;
    }, {} as Record<string, PerformanceRecord>);

    for (const [key, record] of Object.entries(metricGroups)) {
      metrics[record.metric] = record.value;
    }

    return metrics;
  }

  // Network monitoring
  getNetworkInfo(): NetworkInfo | null {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // Battery monitoring
  getBatteryInfo(): BatteryInfo | null {
    if (this.batteryAPI) {
      return {
        level: this.batteryAPI.level,
        charging: this.batteryAPI.charging,
        chargingTime: this.batteryAPI.chargingTime,
        dischargingTime: this.batteryAPI.dischargingTime
      };
    }
    return null;
  }

  // Cleanup
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isMonitoring = false;
  }
}

export const performanceMonitoring = new PerformanceMonitoringService();