import React, { useState, useCallback } from 'react';
import type { CredentialListItem } from './types';

interface QuickSearchProps {
  onSelect: (credential: CredentialListItem) => void;
}

/**
 * QuickSearch - 快速搜索框组件
 * 调用搜索 API 并展示匹配的凭证列表，用户选择后触发自动填充。
 */
export function QuickSearch({ onSelect }: QuickSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<CredentialListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (value: string) => {
    setKeyword(value);
    setError(null);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_CREDENTIALS',
        keyword: value.trim(),
      });

      if (response?.error) {
        setError(response.error);
        setResults([]);
      } else {
        setResults(Array.isArray(response) ? response : []);
      }
    } catch {
      setError('搜索失败，请重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: '8px' }}>
      <input
        type="text"
        value={keyword}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="搜索凭证..."
        aria-label="搜索凭证"
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
        }}
      />

      {loading && <p style={{ padding: '8px', color: '#888', fontSize: '13px' }}>搜索中...</p>}

      {error && <p style={{ padding: '8px', color: '#e53e3e', fontSize: '13px' }}>{error}</p>}

      {!loading && !error && results.length > 0 && (
        <ul style={{ listStyle: 'none', marginTop: '4px' }}>
          {results.map((cred) => (
            <li
              key={cred.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(cred)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(cred); }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                borderRadius: '4px',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '14px' }}>{cred.accountName}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {cred.username}
                {cred.url && <span> · {cred.url}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && keyword.trim() && results.length === 0 && (
        <p style={{ padding: '8px', color: '#888', fontSize: '13px' }}>未找到匹配的凭证</p>
      )}
    </div>
  );
}
