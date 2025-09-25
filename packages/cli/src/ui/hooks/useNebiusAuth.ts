/**
 * @license
 * Copyright 2025 Nebius
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { LoadedSettings } from '../../config/settings.js';
import {
  AuthType,
  qwenOAuth2Events,
  NebiusOAuth2Event,
} from '@nebius-code/nebius-code-core';

export interface DeviceAuthorizationInfo {
  verification_uri: string;
  verification_uri_complete: string;
  user_code: string;
  expires_in: number;
}

interface NebiusAuthState {
  isNebiusAuthenticating: boolean;
  deviceAuth: DeviceAuthorizationInfo | null;
  authStatus:
    | 'idle'
    | 'polling'
    | 'success'
    | 'error'
    | 'timeout'
    | 'rate_limit';
  authMessage: string | null;
}

export const useNebiusAuth = (
  settings: LoadedSettings,
  isAuthenticating: boolean,
) => {
  const [qwenAuthState, setNebiusAuthState] = useState<NebiusAuthState>({
    isNebiusAuthenticating: false,
    deviceAuth: null,
    authStatus: 'idle',
    authMessage: null,
  });

  const isNebiusAuth = settings.merged.selectedAuthType === AuthType.QWEN_OAUTH;

  // Set up event listeners when authentication starts
  useEffect(() => {
    if (!isNebiusAuth || !isAuthenticating) {
      // Reset state when not authenticating or not Nebius auth
      setNebiusAuthState({
        isNebiusAuthenticating: false,
        deviceAuth: null,
        authStatus: 'idle',
        authMessage: null,
      });
      return;
    }

    setNebiusAuthState((prev) => ({
      ...prev,
      isNebiusAuthenticating: true,
      authStatus: 'idle',
    }));

    // Set up event listeners
    const handleDeviceAuth = (deviceAuth: DeviceAuthorizationInfo) => {
      setNebiusAuthState((prev) => ({
        ...prev,
        deviceAuth: {
          verification_uri: deviceAuth.verification_uri,
          verification_uri_complete: deviceAuth.verification_uri_complete,
          user_code: deviceAuth.user_code,
          expires_in: deviceAuth.expires_in,
        },
        authStatus: 'polling',
      }));
    };

    const handleAuthProgress = (
      status: 'success' | 'error' | 'polling' | 'timeout' | 'rate_limit',
      message?: string,
    ) => {
      setNebiusAuthState((prev) => ({
        ...prev,
        authStatus: status,
        authMessage: message || null,
      }));
    };

    // Add event listeners
    qwenOAuth2Events.on(NebiusOAuth2Event.AuthUri, handleDeviceAuth);
    qwenOAuth2Events.on(NebiusOAuth2Event.AuthProgress, handleAuthProgress);

    // Cleanup event listeners when component unmounts or auth finishes
    return () => {
      qwenOAuth2Events.off(NebiusOAuth2Event.AuthUri, handleDeviceAuth);
      qwenOAuth2Events.off(NebiusOAuth2Event.AuthProgress, handleAuthProgress);
    };
  }, [isNebiusAuth, isAuthenticating]);

  const cancelNebiusAuth = useCallback(() => {
    // Emit cancel event to stop polling
    qwenOAuth2Events.emit(NebiusOAuth2Event.AuthCancel);

    setNebiusAuthState({
      isNebiusAuthenticating: false,
      deviceAuth: null,
      authStatus: 'idle',
      authMessage: null,
    });
  }, []);

  return {
    ...qwenAuthState,
    isNebiusAuth,
    cancelNebiusAuth,
  };
};
