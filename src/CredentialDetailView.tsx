import React, { useState, useEffect } from 'react';
import type { CredentialDetail, CredentialListItem } from './types';

interface Props {
  credentialId: number;
  onBack: () => void;
  onEdit: () => void;
  onFill: (cred: CredentialListItem) => void;
  onDeleted: () => void;
}

export function CredentialDetailView({ credentialId, onBack, onEdit, onFill, onDeleted }: Props) {
  const [detail, setDetail] = useState<CredentialDetail | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CREDENTIAL', credentialId })
      .then((r) => { if (r?.error) setError(r.error); else setDetail(r); })
      .catch(() => setError('加载失败'));
  }, [credentialId]);

  const revealPassword = async () => {
    const r = await chrome.runtime.sendMessage({ type: 'REVEAL_PASSWORD', credentialId });
    if (r?.password) { setPassword(r.password); setShowPwd(true); setTimeout(() => setShowPwd(false), 30000); }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleDelete = async () => {
    const r = await chrome.runtime.sendMessage({ type: 'DELETE_CREDENTIAL', credentialId });
    if (r?.success) onDeleted();
    else setError('删除失败');
  };

  if (error) return <div style={{ padding: '16px' }}><button onClick={onBack} style={linkBtn}>← 返回</button><p style={{ color: '#e53e3e', marginTop: '8px' }}>{error}</p></div>;
  if (!detail) return <div style={{ padding: '16px', color: '#888' }}>加载中...</div>;

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={onBack} style={linkBtn}>← 返回</button>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onFill({ id: detail.id, accountName: detail.accountName, username: detail.username, url: detail.url, tags: detail.tags })}
            style={actionBtn} title="填充当前页面">📋 填充</button>
          {detail.url && (
            <button onClick={async () => {
              await chrome.runtime.sendMessage({ type: 'NAVIGATE_AND_FILL', credentialId: detail.id, url: detail.url });
            }} style={actionBtn} title="跳转到网站并填充">🚀 跳转</button>
          )}
          <button onClick={onEdit} style={actionBtn}>✏️ 编辑</button>
        </div>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>{detail.accountName}</h3>

      <Field label="用户名" value={detail.username}
        onCopy={() => copy(detail.username, '用户名')} copied={copied === '用户名'} />

      <div style={fieldRow}>
        <span style={labelStyle}>密码</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            {showPwd && password ? password : '••••••••'}
          </span>
          <button onClick={showPwd ? () => setShowPwd(false) : revealPassword} style={smallBtn}>
            {showPwd ? '隐藏' : '显示'}
          </button>
          <button onClick={async () => {
            if (!password) { const r = await chrome.runtime.sendMessage({ type: 'REVEAL_PASSWORD', credentialId }); if (r?.password) { setPassword(r.password); copy(r.password, '密码'); } }
            else copy(password, '密码');
          }} style={smallBtn}>{copied === '密码' ? '✓' : '复制'}</button>
        </div>
      </div>

      {detail.url && <Field label="URL" value={detail.url} onCopy={() => copy(detail.url!, 'URL')} copied={copied === 'URL'} />}
      {detail.tags && <Field label="标签" value={detail.tags} />}
      {detail.notes && <Field label="备注" value={detail.notes} />}

      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '11px', color: '#999' }}>
        创建: {detail.createdAt} · 更新: {detail.updatedAt}
      </div>

      <div style={{ marginTop: '12px' }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ ...actionBtn, color: '#e53e3e', borderColor: '#e53e3e' }}>🗑 删除</button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#e53e3e', fontSize: '12px' }}>确认删除？</span>
            <button onClick={handleDelete} style={{ ...smallBtn, color: '#fff', backgroundColor: '#e53e3e', border: 'none' }}>确认</button>
            <button onClick={() => setConfirmDelete(false)} style={smallBtn}>取消</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div style={fieldRow}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ wordBreak: 'break-all' }}>{value}</span>
        {onCopy && <button onClick={onCopy} style={smallBtn}>{copied ? '✓' : '复制'}</button>}
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontSize: '13px', padding: 0 };
const actionBtn: React.CSSProperties = { padding: '4px 8px', fontSize: '12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' };
const smallBtn: React.CSSProperties = { padding: '2px 6px', fontSize: '11px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '3px', cursor: 'pointer' };
const fieldRow: React.CSSProperties = { marginBottom: '10px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#888', marginBottom: '2px' };
