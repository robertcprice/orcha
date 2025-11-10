/**
 * Redis Health Check Service
 *
 * Checks if Redis server is running and attempts to start it if not.
 */

export interface RedisHealthStatus {
  isRunning: boolean;
  error?: string;
  message?: string;
}

/**
 * Check if Redis server is running
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  try {
    const response = await fetch('/api/health/redis', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isRunning: data.isRunning || false,
        message: data.message,
      };
    }

    return {
      isRunning: false,
      error: `Health check failed: ${response.statusText}`,
    };
  } catch (error) {
    return {
      isRunning: false,
      error: error instanceof Error ? error.message : 'Unknown error checking Redis health',
    };
  }
}

/**
 * Attempt to start Redis server
 */
export async function startRedisServer(): Promise<RedisHealthStatus> {
  try {
    const response = await fetch('/api/health/redis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isRunning: data.success || false,
        message: data.message,
      };
    }

    return {
      isRunning: false,
      error: `Failed to start Redis: ${response.statusText}`,
    };
  } catch (error) {
    return {
      isRunning: false,
      error: error instanceof Error ? error.message : 'Unknown error starting Redis',
    };
  }
}

/**
 * Check Redis health and auto-start if not running
 */
export async function ensureRedisRunning(): Promise<RedisHealthStatus> {
  console.log('🔍 Checking Redis health...');

  const healthCheck = await checkRedisHealth();

  if (healthCheck.isRunning) {
    console.log('✅ Redis is running');
    return healthCheck;
  }

  console.log('⚠️ Redis is not running, attempting to start...');
  const startResult = await startRedisServer();

  if (startResult.isRunning) {
    console.log('✅ Redis started successfully');
  } else {
    console.error('❌ Failed to start Redis:', startResult.error);
  }

  return startResult;
}
