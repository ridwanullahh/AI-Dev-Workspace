import React from 'react';
import { db } from '../database/schema';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userIds?: string[];
    projectTypes?: string[];
    betaUsers?: boolean;
  };
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userId: string | null = null;

  async initialize() {
    await this.loadFlags();
  }

  private async loadFlags() {
    const flagSettings = await db.settings
      .where('category').equals('general')
      .and(s => s.key.startsWith('feature_'))
      .toArray();

    flagSettings.forEach(setting => {
      this.flags.set(setting.key.replace('feature_', ''), setting.value);
    });

    // Default flags
    this.setDefaultFlags();
  }

  private setDefaultFlags() {
    const defaults: FeatureFlag[] = [
      {
        id: 'github_sync',
        name: 'GitHub Synchronization',
        description: 'Bidirectional sync with GitHub repositories',
        enabled: true,
        rolloutPercentage: 100
      },
      {
        id: 'ai_agents',
        name: 'AI Agents',
        description: 'Autonomous AI agent orchestration',
        enabled: true,
        rolloutPercentage: 100
      },
      {
        id: 'vector_search',
        name: 'Semantic Search',
        description: 'TensorFlow-powered vector search',
        enabled: true,
        rolloutPercentage: 100
      },
      {
        id: 'live_preview',
        name: 'Live Preview',
        description: 'In-browser live preview with hot reload',
        enabled: true,
        rolloutPercentage: 100
      },
      {
        id: 'deployment_automation',
        name: 'Deployment Automation',
        description: 'One-click deployment to Vercel/Netlify/GitHub Pages',
        enabled: true,
        rolloutPercentage: 100
      },
      {
        id: 'collaboration',
        name: 'Real-time Collaboration',
        description: 'Work together with team members in real-time',
        enabled: false,
        rolloutPercentage: 0,
        conditions: { betaUsers: true }
      },
      {
        id: 'local_models',
        name: 'Local AI Models',
        description: 'Run AI models locally in browser with WebLLM',
        enabled: false,
        rolloutPercentage: 10
      },
      {
        id: 'advanced_git',
        name: 'Advanced Git Operations',
        description: 'Rebase, cherry-pick, and advanced merge strategies',
        enabled: false,
        rolloutPercentage: 50
      },
      {
        id: 'code_analysis',
        name: 'Code Analysis',
        description: 'Static analysis and code quality metrics',
        enabled: false,
        rolloutPercentage: 30
      },
      {
        id: 'mobile_native',
        name: 'Native Mobile Features',
        description: 'Camera, sensors, and native APIs via Capacitor',
        enabled: false,
        rolloutPercentage: 0
      }
    ];

    defaults.forEach(flag => {
      if (!this.flags.has(flag.id)) {
        this.flags.set(flag.id, flag);
      }
    });
  }

  isEnabled(flagId: string, context?: { userId?: string; projectType?: string }): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    // Check if explicitly disabled
    if (!flag.enabled) return false;

    // Check conditions
    if (flag.conditions) {
      // User ID whitelist
      if (flag.conditions.userIds && context?.userId) {
        if (!flag.conditions.userIds.includes(context.userId)) {
          return false;
        }
      }

      // Project type filter
      if (flag.conditions.projectTypes && context?.projectType) {
        if (!flag.conditions.projectTypes.includes(context.projectType)) {
          return false;
        }
      }

      // Beta users only
      if (flag.conditions.betaUsers) {
        const isBetaUser = this.checkBetaUser(context?.userId);
        if (!isBetaUser) return false;
      }
    }

    // Rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userId = context?.userId || this.userId || 'anonymous';
      const hash = this.hashString(userId + flagId);
      const percentage = (hash % 100) + 1;
      return percentage <= flag.rolloutPercentage;
    }

    return true;
  }

  async setFlag(flagId: string, enabled: boolean, rolloutPercentage?: number) {
    const flag = this.flags.get(flagId);
    if (!flag) return;

    flag.enabled = enabled;
    if (rolloutPercentage !== undefined) {
      flag.rolloutPercentage = rolloutPercentage;
    }

    this.flags.set(flagId, flag);

    await db.settings.put({
      id: `feature_${flagId}`,
      category: 'general',
      key: `feature_${flagId}`,
      value: flag,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  async setRolloutPercentage(flagId: string, percentage: number) {
    const flag = this.flags.get(flagId);
    if (!flag) return;

    flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
    this.flags.set(flagId, flag);

    await db.settings.put({
      id: `feature_${flagId}`,
      category: 'general',
      key: `feature_${flagId}`,
      value: flag,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private checkBetaUser(userId?: string): boolean {
    // Check if user is in beta program
    // This could be determined by database flag or external service
    return false; // Default: no beta access
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Analytics
  async trackFeatureUsage(flagId: string, context?: Record<string, any>) {
    await db.performance.add({
      id: `feature_usage_${Date.now()}`,
      category: 'ui',
      metric: `feature_${flagId}`,
      value: 1,
      metadata: context || {},
      timestamp: new Date()
    });
  }
}

export const featureFlags = new FeatureFlagService();

// React hook for feature flags
export function useFeatureFlag(flagId: string): boolean {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const checkFlag = () => {
      const isEnabled = featureFlags.isEnabled(flagId);
      setEnabled(isEnabled);
    };

    checkFlag();
  }, [flagId]);

  return enabled;
}

// HOC for feature-flagged components
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  flagId: string,
  fallback?: React.ReactNode
) {
  return (props: P) => {
    const enabled = useFeatureFlag(flagId);

    if (!enabled) {
      return fallback || null;
    }

    return <Component {...props} />;
  };
}