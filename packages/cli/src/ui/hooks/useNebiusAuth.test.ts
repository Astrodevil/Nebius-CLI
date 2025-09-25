/**
 * @license
 * Copyright 2025 Nebius
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNebiusAuth, DeviceAuthorizationInfo } from './useNebiusAuth.js';
import {
  AuthType,
  qwenOAuth2Events,
  NebiusOAuth2Event,
} from '@nebius-code/nebius-code-core';
import { LoadedSettings } from '../../config/settings.js';

// Mock the qwenOAuth2Events
vi.mock('@nebius-code/nebius-code-core', async () => {
  const actual = await vi.importActual('@nebius-code/nebius-code-core');
  const mockEmitter = {
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
  };
  return {
    ...actual,
    qwenOAuth2Events: mockEmitter,
    NebiusOAuth2Event: {
      AuthUri: 'authUri',
      AuthProgress: 'authProgress',
    },
  };
});

const mockNebiusOAuth2Events = vi.mocked(qwenOAuth2Events);

describe('useNebiusAuth', () => {
  const mockDeviceAuth: DeviceAuthorizationInfo = {
    verification_uri: 'https://oauth.qwen.com/device',
    verification_uri_complete: 'https://oauth.qwen.com/device?user_code=ABC123',
    user_code: 'ABC123',
    expires_in: 1800,
  };

  const createMockSettings = (authType: AuthType): LoadedSettings =>
    ({
      merged: {
        selectedAuthType: authType,
      },
    }) as LoadedSettings;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state when not Nebius auth', () => {
    const settings = createMockSettings(AuthType.USE_GEMINI);
    const { result } = renderHook(() => useNebiusAuth(settings, false));

    expect(result.current).toEqual({
      isNebiusAuthenticating: false,
      deviceAuth: null,
      authStatus: 'idle',
      authMessage: null,
      isNebiusAuth: false,
      cancelNebiusAuth: expect.any(Function),
    });
  });

  it('should initialize with default state when Nebius auth but not authenticating', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    const { result } = renderHook(() => useNebiusAuth(settings, false));

    expect(result.current).toEqual({
      isNebiusAuthenticating: false,
      deviceAuth: null,
      authStatus: 'idle',
      authMessage: null,
      isNebiusAuth: true,
      cancelNebiusAuth: expect.any(Function),
    });
  });

  it('should set up event listeners when Nebius auth and authenticating', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    renderHook(() => useNebiusAuth(settings, true));

    expect(mockNebiusOAuth2Events.on).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockNebiusOAuth2Events.on).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it('should handle device auth event', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationInfo) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.deviceAuth).toEqual(mockDeviceAuth);
    expect(result.current.authStatus).toBe('polling');
    expect(result.current.isNebiusAuthenticating).toBe(true);
  });

  it('should handle auth progress event - success', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleAuthProgress: (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    act(() => {
      handleAuthProgress!('success', 'Authentication successful!');
    });

    expect(result.current.authStatus).toBe('success');
    expect(result.current.authMessage).toBe('Authentication successful!');
  });

  it('should handle auth progress event - error', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleAuthProgress: (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    act(() => {
      handleAuthProgress!('error', 'Authentication failed');
    });

    expect(result.current.authStatus).toBe('error');
    expect(result.current.authMessage).toBe('Authentication failed');
  });

  it('should handle auth progress event - polling', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleAuthProgress: (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    act(() => {
      handleAuthProgress!('polling', 'Waiting for user authorization...');
    });

    expect(result.current.authStatus).toBe('polling');
    expect(result.current.authMessage).toBe(
      'Waiting for user authorization...',
    );
  });

  it('should handle auth progress event - rate_limit', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleAuthProgress: (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    act(() => {
      handleAuthProgress!(
        'rate_limit',
        'Too many requests. The server is rate limiting our requests. Please select a different authentication method or try again later.',
      );
    });

    expect(result.current.authStatus).toBe('rate_limit');
    expect(result.current.authMessage).toBe(
      'Too many requests. The server is rate limiting our requests. Please select a different authentication method or try again later.',
    );
  });

  it('should handle auth progress event without message', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleAuthProgress: (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    act(() => {
      handleAuthProgress!('success');
    });

    expect(result.current.authStatus).toBe('success');
    expect(result.current.authMessage).toBe(null);
  });

  it('should clean up event listeners when auth type changes', () => {
    const qwenSettings = createMockSettings(AuthType.QWEN_OAUTH);
    const { rerender } = renderHook(
      ({ settings, isAuthenticating }) =>
        useNebiusAuth(settings, isAuthenticating),
      { initialProps: { settings: qwenSettings, isAuthenticating: true } },
    );

    // Change to non-Nebius auth
    const geminiSettings = createMockSettings(AuthType.USE_GEMINI);
    rerender({ settings: geminiSettings, isAuthenticating: true });

    expect(mockNebiusOAuth2Events.off).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockNebiusOAuth2Events.off).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it('should clean up event listeners when authentication stops', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    const { rerender } = renderHook(
      ({ isAuthenticating }) => useNebiusAuth(settings, isAuthenticating),
      { initialProps: { isAuthenticating: true } },
    );

    // Stop authentication
    rerender({ isAuthenticating: false });

    expect(mockNebiusOAuth2Events.off).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockNebiusOAuth2Events.off).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it('should clean up event listeners on unmount', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    const { unmount } = renderHook(() => useNebiusAuth(settings, true));

    unmount();

    expect(mockNebiusOAuth2Events.off).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockNebiusOAuth2Events.off).toHaveBeenCalledWith(
      NebiusOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it('should reset state when switching from Nebius auth to another auth type', () => {
    const qwenSettings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationInfo) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result, rerender } = renderHook(
      ({ settings, isAuthenticating }) =>
        useNebiusAuth(settings, isAuthenticating),
      { initialProps: { settings: qwenSettings, isAuthenticating: true } },
    );

    // Simulate device auth
    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.deviceAuth).toEqual(mockDeviceAuth);
    expect(result.current.authStatus).toBe('polling');

    // Switch to different auth type
    const geminiSettings = createMockSettings(AuthType.USE_GEMINI);
    rerender({ settings: geminiSettings, isAuthenticating: true });

    expect(result.current.isNebiusAuthenticating).toBe(false);
    expect(result.current.deviceAuth).toBe(null);
    expect(result.current.authStatus).toBe('idle');
    expect(result.current.authMessage).toBe(null);
  });

  it('should reset state when authentication stops', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationInfo) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result, rerender } = renderHook(
      ({ isAuthenticating }) => useNebiusAuth(settings, isAuthenticating),
      { initialProps: { isAuthenticating: true } },
    );

    // Simulate device auth
    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.deviceAuth).toEqual(mockDeviceAuth);
    expect(result.current.authStatus).toBe('polling');

    // Stop authentication
    rerender({ isAuthenticating: false });

    expect(result.current.isNebiusAuthenticating).toBe(false);
    expect(result.current.deviceAuth).toBe(null);
    expect(result.current.authStatus).toBe('idle');
    expect(result.current.authMessage).toBe(null);
  });

  it('should handle cancelNebiusAuth function', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationInfo) => void;

    mockNebiusOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === NebiusOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockNebiusOAuth2Events;
    });

    const { result } = renderHook(() => useNebiusAuth(settings, true));

    // Set up some state
    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.deviceAuth).toEqual(mockDeviceAuth);

    // Cancel auth
    act(() => {
      result.current.cancelNebiusAuth();
    });

    expect(result.current.isNebiusAuthenticating).toBe(false);
    expect(result.current.deviceAuth).toBe(null);
    expect(result.current.authStatus).toBe('idle');
    expect(result.current.authMessage).toBe(null);
  });

  it('should maintain isNebiusAuth flag correctly', () => {
    // Test with Nebius OAuth
    const qwenSettings = createMockSettings(AuthType.QWEN_OAUTH);
    const { result: qwenResult } = renderHook(() =>
      useNebiusAuth(qwenSettings, false),
    );
    expect(qwenResult.current.isNebiusAuth).toBe(true);

    // Test with other auth types
    const geminiSettings = createMockSettings(AuthType.USE_GEMINI);
    const { result: geminiResult } = renderHook(() =>
      useNebiusAuth(geminiSettings, false),
    );
    expect(geminiResult.current.isNebiusAuth).toBe(false);

    const oauthSettings = createMockSettings(AuthType.LOGIN_WITH_GOOGLE);
    const { result: oauthResult } = renderHook(() =>
      useNebiusAuth(oauthSettings, false),
    );
    expect(oauthResult.current.isNebiusAuth).toBe(false);
  });

  it('should set isNebiusAuthenticating to true when starting authentication with Nebius auth', () => {
    const settings = createMockSettings(AuthType.QWEN_OAUTH);
    const { result } = renderHook(() => useNebiusAuth(settings, true));

    expect(result.current.isNebiusAuthenticating).toBe(true);
    expect(result.current.authStatus).toBe('idle');
  });
});
