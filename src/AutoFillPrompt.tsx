import React, { useState, useEffect } from 'react';
import type { CredentialListItem } from './types';

interface AutoFillPromptProps {
  credentials: CredentialListItem[];
  onSelect: (credential: CredentialListItem) => void;
  onDismiss: () => void;
}

/**
 * AutoFillPrompt - 自动填充提示组件
 *
 * 当 Content Script 检测到登录表单并匹配到凭证时，
 * 在页面上显示匹配的凭证列表供用户选择填充。
 */
export function AutoFillPrompt({ credentials, onSelect, onDismiss }: AutoFillPromptProps) {
  if (credentials.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        width: '300px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 2147483647,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>🔑 自动填充</span>
        <button
          onClick={onDismiss}
          aria-label="关闭"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#888',
          }}
        >
          ✕
        </button>
      </div>
      <ul style={{ listStyle: 'none', maxHeight: '200px', overflowY: 'auto' }}>
        {credentials.map((cred) => (
          <li
            key={cred.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(cred)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect(cred); }}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #f7f7f7',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: '13px' }}>{cred.accountName}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{cred.username}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
