import React, { useState, useEffect } from 'react';
import { QuickSearch } from './QuickSearch';
import type { CredentialListItem } from './types';

/**
 * Popup - Chrome Extension 弹出窗口主界面
 *
 * - Vault 解锁时：显示 QuickSearch 搜索框，用户可搜索并选择凭证进行自动填充
 * - Vault 锁定时：显示"请先在桌面应用中解锁密码库"提示
 */
export function Popup() {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [fillStatus, setFillStatus] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHECK_VAULT_STATUS' })
      .then((response) => {
        setIsUnlocked(response?.isUnlocked ?? false);
      })
      .catch(() => {
        setIsUnlocked(false);
      });
  }, []);

  const handleSelect = async (credential: CredentialListItem) => {
    setFillStatus(null);
    try {
      // Get auto-fill data (username + revealed password) from service worker
      const data = await chrome.runtime.sendMessage({
        type: 'AUTO_FILL',
        credentialId: credential.id,
      });

      if (data?.error) {
        setFillStatus(`填充失败: ${data.error}`);
        return;
      }

      // Send fill command to the active tab's content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'FILL_CREDENTIALS',
          username: data.username,
          password: data.password,
        });
        setFillStatus('已填充');
      }
    } catch {
      setFillStatus('填充失败，请重试');
    }
  };

  // Loading state
  if (isUnlocked === null) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
        加载中...
      </div>
    );
  }

  // Locked state
  if (!isUnlocked) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
        <p style={{ fontSize: '14px', color: '#555' }}>
          请先在桌面应用中解锁密码库
        </p>
      </div>
    );
  }

  // Unlocked state
  return (
    <div>
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #eee',
        fontWeight: 600,
        fontSize: '15px',
      }}>
        Password Manager
      </div>
      <QuickSearch onSelect={handleSelect} />
      {fillStatus && (
        <p style={{
          padding: '6px 12px',
          fontSize: '12px',
          color: fillStatus.startsWith('已') ? '#38a169' : '#e53e3e',
        }}>
          {fillStatus}
        </p>
      )}
    </div>
  );
}
