import React, { useState, useEffect, useCallback } from 'react';
import type { CredentialListItem } from './types';

interface QuickSearchProps {
  onSelect: (credential: CredentialListItem) => void;
  onFill: (credential: CredentialListItem) => void;
}

export function QuickSearch({ onSelect, onFill }: QuickSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [allCredentials, setAllCredentials] = useState<CredentialListItem[]>([]);
  const [results, setResults] = useState<CredentialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'LIST_CREDENTIALS' })
      .then((r) => { const list = Array.isArray(r) ? r : []; setAllCredentials(list); setResults(list); })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async (value: string) => {
    setKeyword(value);
    setError(null);
    if (!value.trim()) { setResults(allCredentials); return; }
    setLoading(true);
    try {
      const r = await chrome.runtime.sendMessage({ type: 'SEARCH_CREDENTIALS', keyword: value.trim() });
      setResults(Array.isArray(r) ? r : []);
    } catch { setError('搜索失败'); setResults([]); }
    finally { setLoading(false); }
  }, [allCredentials]);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* fallback: ignore */ }
  };

  return (
    <div style={{ padding: '8px' }}>
      <input
        type="text" value={keyword}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="搜索凭证..."
        aria-label="搜索凭证"
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        autoFocus
      />

      {loading && <p style={hintStyle}>加载中...</p>}
      {error && <p style={{ ...hintStyle, color: '#e53e3e' }}>{error}</p>}

      {!loading && !error && results.length > 0 && (
        <ul style={{ listStyle: 'none', marginTop: '4px', padding: 0, maxHeight: '320px', overflowY: 'auto' }}>
          {results.map((cred) => (
            <li key={cred.id} style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => onSelect(cred)}>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{cred.accountName}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {cred.username}{cred.url && <span> · {cred.url}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
                  <button onClick={() => copyText(cred.username, `u-${cred.id}`)}
                    style={iconBtn} title="复制用户名">
                    {copiedId === `u-${cred.id}` ? '✓' : '👤'}
                  </button>
                  <button onClick={async () => {
                    const r = await chrome.runtime.sendMessage({ type: 'REVEAL_PASSWORD', credentialId: cred.id });
                    if (r?.password) copyText(r.password, `p-${cred.id}`);
                  }} style={iconBtn} title="复制密码">
                    {copiedId === `p-${cred.id}` ? '✓' : '🔑'}
                  </button>
                  <button onClick={() => onFill(cred)} style={iconBtn} title="填充当前页面">📋</button>
                  {cred.url && (
                    <button onClick={async () => {
                      const r = await chrome.runtime.sendMessage({ type: 'NAVIGATE_AND_FILL', credentialId: cred.id, url: cred.url });
                      if (!r?.success) { /* silently handled, tab is already open */ }
                    }} style={iconBtn} title="跳转并填充">🚀</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && results.length === 0 && (
        <p style={hintStyle}>{keyword.trim() ? '未找到匹配的凭证' : '密码库为空'}</p>
      )}
    </div>
  );
}

const hintStyle: React.CSSProperties = { padding: '8px', color: '#888', fontSize: '13px' };
const iconBtn: React.CSSProperties = {
  padding: '3px 6px', fontSize: '13px', background: '#f5f5f5', border: '1px solid #e0e0e0',
  borderRadius: '4px', cursor: 'pointer', lineHeight: 1,
};
