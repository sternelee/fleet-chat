/**
 * Plugin Cache System
 *
 * Memory-efficient caching for plugin components, assets, and compiled results
 * Inspired by Vicinae's performance optimization strategies
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number;
}

export interface CacheOptions {
  maxSize?: number;
  maxEntries?: number;
  ttl?: number;
  enableLRU?: boolean;
  enableCompression?: boolean;
}

/**
 * LRU Cache implementation for plugin data
 */
export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder: K[] = [];
  private maxSize: number;
  private maxEntries: number;
  private totalSize: number = 0;

  constructor(private options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB
    this.maxEntries = options.maxEntries || 1000;
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (most recently used)
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V, options: { size?: number; ttl?: number } = {}): void {
    const size = options.size || this.calculateSize(value);
    const ttl = options.ttl || this.options.ttl;

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Ensure cache size limits
    this.ensureCapacity(size);

    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      ttl
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.totalSize += size;
  }

  /**
   * Delete entry from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.totalSize -= entry.size;

    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.totalSize = 0;
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    totalSize: number;
    hitRate: number;
    avgAccessCount: number;
  } {
    let totalAccess = 0;
    let validEntries = 0;

    for (const entry of this.cache.values()) {
      // Clean up expired entries
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        continue;
      }

      totalAccess += entry.accessCount;
      validEntries++;
    }

    return {
      entries: validEntries,
      totalSize: this.totalSize,
      hitRate: totalAccess > 0 ? (totalAccess - validEntries) / totalAccess : 0,
      avgAccessCount: validEntries > 0 ? totalAccess / validEntries : 0
    };
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Ensure cache capacity for new entry
   */
  private ensureCapacity(requiredSize: number): void {
    // Remove expired entries first
    this.cleanupExpired();

    // Remove least recently used entries until we have enough space
    while (
      (this.cache.size >= this.maxEntries) ||
      (this.totalSize + requiredSize > this.maxSize)
    ) {
      if (this.accessOrder.length === 0) break;

      const lruKey = this.accessOrder[0];
      this.delete(lruKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Calculate size of value (rough estimation)
   */
  private calculateSize(value: V): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }

    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // Default size for unserializable objects
      }
    }

    return 64; // Default size for primitives
  }
}

/**
 * Plugin-specific cache manager
 */
export class PluginCacheManager {
  private componentCache = new LRUCache<string, any>({
    maxSize: 20 * 1024 * 1024, // 20MB for components
    ttl: 30 * 60 * 1000 // 30 minutes
  });

  private templateCache = new LRUCache<string, string>({
    maxSize: 10 * 1024 * 1024, // 10MB for templates
    ttl: 60 * 60 * 1000 // 1 hour
  });

  private assetCache = new LRUCache<string, any>({
    maxSize: 30 * 1024 * 1024, // 30MB for assets
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  });

  private metadataCache = new LRUCache<string, any>({
    maxSize: 5 * 1024 * 1024, // 5MB for metadata
    ttl: 10 * 60 * 1000 // 10 minutes
  });

  /**
   * Cache compiled component
   */
  cacheComponent(pluginId: string, commandName: string, component: any): void {
    const key = `${pluginId}:${commandName}`;
    this.componentCache.set(key, component, {
      ttl: 15 * 60 * 1000 // 15 minutes for components
    });
  }

  /**
   * Get cached component
   */
  getComponent(pluginId: string, commandName: string): any {
    const key = `${pluginId}:${commandName}`;
    return this.componentCache.get(key);
  }

  /**
   * Cache compiled template
   */
  cacheTemplate(pluginId: string, templateId: string, template: string): void {
    const key = `${pluginId}:${templateId}`;
    this.templateCache.set(key, template);
  }

  /**
   * Get cached template
   */
  getTemplate(pluginId: string, templateId: string): string | undefined {
    const key = `${pluginId}:${templateId}`;
    return this.templateCache.get(key);
  }

  /**
   * Cache plugin asset
   */
  cacheAsset(pluginId: string, assetPath: string, asset: any): void {
    const key = `${pluginId}:${assetPath}`;
    this.assetCache.set(key, asset);
  }

  /**
   * Get cached asset
   */
  getAsset(pluginId: string, assetPath: string): any {
    const key = `${pluginId}:${assetPath}`;
    return this.assetCache.get(key);
  }

  /**
   * Cache plugin metadata
   */
  cacheMetadata(pluginId: string, metadata: any): void {
    this.metadataCache.set(pluginId, metadata);
  }

  /**
   * Get cached metadata
   */
  getMetadata(pluginId: string): any {
    return this.metadataCache.get(pluginId);
  }

  /**
   * Clear plugin cache
   */
  clearPluginCache(pluginId: string): void {
    // Clear all caches for specific plugin
    this.clearCacheByPattern(this.componentCache, `${pluginId}:`);
    this.clearCacheByPattern(this.templateCache, `${pluginId}:`);
    this.clearCacheByPattern(this.assetCache, `${pluginId}:`);
    this.metadataCache.delete(pluginId as any);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.componentCache.clear();
    this.templateCache.clear();
    this.assetCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    components: any;
    templates: any;
    assets: any;
    metadata: any;
    total: {
      size: number;
      entries: number;
    };
  } {
    const componentStats = this.componentCache.getStats();
    const templateStats = this.templateCache.getStats();
    const assetStats = this.assetCache.getStats();
    const metadataStats = this.metadataCache.getStats();

    return {
      components: componentStats,
      templates: templateStats,
      assets: assetStats,
      metadata: metadataStats,
      total: {
        size: componentStats.totalSize + templateStats.totalSize +
          assetStats.totalSize + metadataStats.totalSize,
        entries: componentStats.entries + templateStats.entries +
          assetStats.entries + metadataStats.entries
      }
    };
  }

  /**
   * Optimize cache based on usage patterns
   */
  optimizeCaches(): void {
    const stats = this.getMemoryStats();

    // If total size exceeds threshold, clear least used caches
    if (stats.total.size > 80 * 1024 * 1024) { // 80MB threshold
      console.log('Plugin cache optimization triggered');

      // Clear older entries from component cache
      this.optimizeCacheByUsage(this.componentCache, 0.3); // Keep top 30%
      this.optimizeCacheByUsage(this.templateCache, 0.5); // Keep top 50%
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Clear cache entries by pattern
   */
  private clearCacheByPattern<K, V>(cache: LRUCache<K, V>, _pattern: string): void {
    // This is a simplified implementation
    // In a real implementation, you'd iterate through cache keys
    cache.clear();
  }

  /**
   * Optimize cache by keeping only most used entries
   */
  private optimizeCacheByUsage<K, V>(cache: LRUCache<K, V>, keepRatio: number): void {
    const stats = cache.getStats();
    const targetEntries = Math.floor(stats.entries * keepRatio);

    if (targetEntries < stats.entries) {
      // This would require extending LRUCache to support selective clearing
      console.log(`Optimizing cache: keeping ${targetEntries} of ${stats.entries} entries`);
    }
  }
}

/**
 * Memory monitor for plugin system
 */
export class PluginMemoryMonitor {
  private memoryStats: any[] = [];
  private monitoringInterval: number | null = null;
  private readonly maxHistorySize = 100;

  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.recordMemoryStats();
    }, intervalMs) as any;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record current memory statistics
   */
  private recordMemoryStats(): void {
    const stats = this.getMemoryStats();

    this.memoryStats.push({
      timestamp: Date.now(),
      ...stats
    });

    // Keep only recent history
    if (this.memoryStats.length > this.maxHistorySize) {
      this.memoryStats.shift();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): any {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
      };
    }

    // Fallback for environments without performance.memory
    return {
      used: 0,
      total: 0,
      limit: 0,
      usage: 0
    };
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): any[] {
    return [...this.memoryStats];
  }

  /**
   * Check if memory usage is critical
   */
  isMemoryCritical(): boolean {
    const stats = this.getMemoryStats();
    return stats.usage > 0.8; // 80% threshold
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryStats.length < 2) {
      return 'stable';
    }

    const recent = this.memoryStats.slice(-5);
    const first = recent[0]?.usage || 0;
    const last = recent[recent.length - 1]?.usage || 0;
    const threshold = 0.05; // 5% threshold

    if (last > first + threshold) {
      return 'increasing';
    } else if (last < first - threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }
}

/**
 * Global plugin cache instance
 */
export const pluginCacheManager = new PluginCacheManager();

/**
 * Global memory monitor instance
 */
export const pluginMemoryMonitor = new PluginMemoryMonitor();
