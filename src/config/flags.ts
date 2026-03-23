/**
 * Feature flags configuration
 * Controls the rollout of new features and experimental functionality
 */

export interface FeatureFlags {
  /**
   * Enable plugin system (Stage 7 - not yet implemented)
   */
  enableEditorPlugins: boolean;
  
  /**
   * Enable advanced accessibility features
   */
  enableAdvancedAccessibility: boolean;
  
  /**
   * Enable performance monitoring and metrics
   */
  enablePerformanceMetrics: boolean;
}

/**
 * Default feature flags
 * Can be overridden via environment variables or runtime configuration
 */
export const flags: FeatureFlags = {
  enableEditorPlugins: false,
  enableAdvancedAccessibility: true,
  enablePerformanceMetrics: false
};

/**
 * Get feature flag value with environment variable override support
 * Environment variables should be prefixed with VITE_FEATURE_
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(flagName: K): FeatureFlags[K] {
  const envVarName = `VITE_FEATURE_${flagName.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
  const envValue = import.meta.env[envVarName];
  
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  return flags[flagName];
}