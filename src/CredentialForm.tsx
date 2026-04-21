import React, { useState, useEffect } from 'react';
import type { CredentialDetail } from './types';

interface Props {
  mode: 'create' | 'edit';
  credentialId?: number;
  onBack: () => void;
  onSaved: () => void;
}

export function CredentialForm({ mode, credentialId, onBack, onSaved }: Props) {
  const [accountName, setAccountName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');

  // Pre-fill current tab URL for new credentials
  useEffect(() => {
    if (mode === 'create') {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.url && !tab.url.startsWith('chrome')) setUrl(tab.url);
      });
    }
  }, [mode]);

  // Load existing credential for edit mode
  useEffect(() => {
    if (mode === 'edit' && credentialId) {
      chrome.runtime.sendMessage({ type: 'GET_CREDENTIAL', credentialId })
        .then((r: CredentialDetail) => {
          setAccountName(r.accountName);
          setUsername(r.username);
          setUrl(r.url ?? '');
          setNotes(r.notes ?? '');
          setTags(r.tags ?? '');
          setLoading(false);
        })
        .catch(() => { setError('加载失败'); setLoading(false); });
    }
  }, [mode, credentialId]);

  const handleSave = async () => {
    if (!accountName.trim() || !username.trim()) {
      setError('账户名称和用户名为必填项');
      return;
    }
    if (mode === 'create' && !password.trim()) {
      setError('密码为必填项');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const data: Record<string, string> = { accountName: accountName.trim(), username: username.trim() };
      if (password.trim()) data.password = password.trim();
      if (url.trim()) data.url = url.trim();
      if (notes.trim()) data.notes = notes.trim();
      if (tags.trim()) data.tags = tags.trim();

      const msg = mode === 'create'
        ? { type: 'CREATE_CREDENTIAL' as const, data }
        : { type: 'UPDATE_CREDENTIAL' as const, credentialId, data };

      const r = await chrome.runtime.sendMessage(msg);
      if (r?.error) setError(r.error);
      else onSaved();
    } catch { setError('保存失败'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: '16px', color: '#888' }}>加载中...</div>;

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={onBack} style={linkBtn}>← 返回</button>
        <span style={{ fontWeight: 600 }}>{mode === 'create' ? '新建凭证' : '编辑凭证'}</span>
      </div>

      <label style={labelStyle}>账户名称 *</label>
      <input value={accountName} onChange={(e) => setAccountName(e.target.value)} style={inputStyle} placeholder="如：GitHub" />

      <label style={labelStyle}>用户名 *</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} placeholder="用户名或邮箱" />

      <label style={labelStyle}>{mode === 'create' ? '密码 *' : '新密码（留空不修改）'}</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="密码" />

      <label style={labelStyle}>URL</label>
      <input value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} placeholder="https://..." />

      <label style={labelStyle}>标签</label>
      <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} placeholder="用逗号分隔" />

      <label style={labelStyle}>备注</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        style={{ ...inputStyle, height: '50px', resize: 'vertical' }} placeholder="备注信息" />

      {error && <p style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}

      <button onClick={handleSave} disabled={saving} style={btnPrimary}>
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontSize: '13px', padding: 0 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px', marginTop: '8px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#4285f4', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' };
