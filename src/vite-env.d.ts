/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_GOOGLE_CLIENT_SECRET?: string
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_ANTHROPIC_API_KEY?: string
  readonly VITE_COHERE_API_KEY?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_GA_TRACKING_ID?: string
  readonly VITE_FEATURE_FLAGS_API?: string
  readonly VITE_FEATURE_FLAGS_KEY?: string
  readonly VITE_GITHUB_API_URL?: string
  readonly VITE_OPENAI_API_URL?: string
  readonly VITE_DEBUG_MODE?: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING?: string
  readonly VITE_MOCK_AI_RESPONSES?: string
  readonly VITE_ENVIRONMENT?: string
  readonly VITE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
