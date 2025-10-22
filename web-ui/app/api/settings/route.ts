import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SETTINGS_DIR = join(process.cwd(), '.settings');
const SETTINGS_FILE = join(SETTINGS_DIR, 'app-settings.json');

interface AppSettings {
  theme: {
    mode: 'dark' | 'light';
    colorScheme: 'blue' | 'purple' | 'green' | 'orange' | 'custom';
    customColors?: {
      primary: string;
      secondary: string;
      accent: string;
      success: string;
      warning: string;
      error: string;
    };
  };
  apiKeys: {
    anthropic: string;
    openai: string;
    databento?: string;
    redis?: string;
  };
  advanced: {
    redisUrl: string;
    autoRefreshInterval: number;
    maxTaskHistory: number;
    enableWebSocket: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: {
    mode: 'dark',
    colorScheme: 'blue',
  },
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    databento: process.env.DATABENTO_API_KEY || '',
    redis: process.env.REDIS_URL || 'redis://localhost:6379/0',
  },
  advanced: {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',
    autoRefreshInterval: 2000,
    maxTaskHistory: 100,
    enableWebSocket: true,
    logLevel: 'info',
  },
};

async function ensureSettingsDir() {
  if (!existsSync(SETTINGS_DIR)) {
    await mkdir(SETTINGS_DIR, { recursive: true });
  }
}

async function loadSettings(): Promise<AppSettings> {
  try {
    await ensureSettingsDir();

    if (!existsSync(SETTINGS_FILE)) {
      await saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }

    const data = await readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      theme: { ...DEFAULT_SETTINGS.theme, ...settings.theme },
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...settings.apiKeys },
      advanced: { ...DEFAULT_SETTINGS.advanced, ...settings.advanced },
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  await ensureSettingsDir();
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

// GET - Load settings
export async function GET(request: NextRequest) {
  try {
    const settings = await loadSettings();

    // Mask API keys for security (only show last 4 characters)
    const maskedSettings = {
      ...settings,
      apiKeys: {
        anthropic: settings.apiKeys.anthropic
          ? `${settings.apiKeys.anthropic.slice(0, 8)}...${settings.apiKeys.anthropic.slice(-4)}`
          : '',
        openai: settings.apiKeys.openai
          ? `${settings.apiKeys.openai.slice(0, 8)}...${settings.apiKeys.openai.slice(-4)}`
          : '',
        databento: settings.apiKeys.databento
          ? `${settings.apiKeys.databento.slice(0, 8)}...${settings.apiKeys.databento.slice(-4)}`
          : '',
        redis: settings.apiKeys.redis,
      },
    };

    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// POST - Save settings
export async function POST(request: NextRequest) {
  try {
    const newSettings = await request.json() as AppSettings;

    // Load existing settings to preserve masked API keys if not changed
    const existingSettings = await loadSettings();

    // Only update API keys if they're not masked
    const apiKeys = { ...newSettings.apiKeys };
    Object.keys(apiKeys).forEach((key) => {
      const value = apiKeys[key as keyof typeof apiKeys];
      if (value && value.includes('...')) {
        // This is a masked value, keep the existing one
        apiKeys[key as keyof typeof apiKeys] =
          existingSettings.apiKeys[key as keyof typeof existingSettings.apiKeys] || '';
      }
    });

    const settingsToSave: AppSettings = {
      ...newSettings,
      apiKeys,
    };

    await saveSettings(settingsToSave);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

// PATCH - Update specific settings
export async function PATCH(request: NextRequest) {
  try {
    const updates = await request.json();
    const existingSettings = await loadSettings();

    const updatedSettings = {
      ...existingSettings,
      ...updates,
      theme: { ...existingSettings.theme, ...(updates.theme || {}) },
      apiKeys: { ...existingSettings.apiKeys, ...(updates.apiKeys || {}) },
      advanced: { ...existingSettings.advanced, ...(updates.advanced || {}) },
    };

    await saveSettings(updatedSettings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
