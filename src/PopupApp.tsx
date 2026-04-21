import React, { useState, useEffect } from 'react';
import { QuickSearch } from './QuickSearch';
import { CredentialDetailView } from './CredentialDetailView';
import { CredentialForm } from './CredentialForm';
import type { CredentialListItem } from './types';

type View = 'list' | 'detail' | 'create' | 'edit';

export function Popup() {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fillStatus, setFillStatus] = useState<string | null>(null);
  // Unlock state
  const [masterPassword, setMasterPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHECK_VAULT_STATUS' })
      .then((r) => setIsUnlocked(r?.isUnlocked ?? false))
      .catch(() => setIsUnlocked(false));
  }, []);

  const handleUnlock = async () => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      const r = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT', masterPassword });
      if (r?.error) setUnlockError(r.error);
      else if (r?.mfaRequired) setMfaRequired(true);
      else if (r?.isUnlocked) setIsUnlocked(true);
    } catch { setUnlockError('解锁失败，请检查后端服务'); }
    finally { setUnlocking(false); }
  };

  const handleVerifyTotp = async () => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      const r = await chrome.runtime.sendMessage({ type: 'VERIFY_TOTP', totpCode });
      if (r?.error) setUnlockError(r.error);
      else if (r?.isUnlocked) setIsUnlocked(true);
    } catch { setUnlockError('验证失败'); }
    finally { setUnlocking(false); }
  };

  const handleFill = async (credential: CredentialListItem) => {
    setFillStatus(null);
    try {
      const data = await chrome.runtime.sendMessage({ type: 'AUTO_FILL', credentialId: credential.id });
      if (data?.error) { setFillStatus(`获取失败: ${data.error}`); return; }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { setFillStatus('无法获取标签页'); return; }

      // Send fill message to ALL frames (login forms may be in iframes)
      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      let filled = false;
      if (frames) {
        const results = await Promise.allSettled(
          frames.map((frame) =>
            chrome.tabs.sendMessage(tab.id!, {
              type: 'FILL_CREDENTIALS',
              username: data.username,
              password: data.password,
            }, { frameId: frame.frameId })
          )
        );
        filled = results.some(
          (r) => r.status === 'fulfilled' && r.value?.success
        );
      }
      setFillStatus(filled ? '✅ 已填充' : '未检测到登录表单，请刷新页面后重试');
    } catch { setFillStatus('填充失败，请重试'); }
  };

  // Loading
  if (isUnlocked === null) return <div style={centerStyle}>加载中...</div>;

  // Locked
  if (!isUnlocked) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '28px' }}>🔒</div>
          <p style={{ fontSize: '13px', color: '#555', margin: '8px 0 0' }}>
            {mfaRequired ? '请输入 TOTP 验证码' : '输入主密码解锁密码库'}
          </p>
        </div>
        {!mfaRequired ? (
          <>
            <input type="password" placeholder="主密码" value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              style={inputStyle} autoFocus />
            <button onClick={handleUnlock} disabled={unlocking || !masterPassword} style={btnPrimary}>
              {unlocking ? '解锁中...' : '解锁'}
            </button>
          </>
        ) : (
          <>
            <input type="text" placeholder="6 位验证码" value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyTotp()}
              maxLength={6} style={inputStyle} autoFocus />
            <button onClick={handleVerifyTotp} disabled={unlocking || totpCode.length < 6} style={btnPrimary}>
              {unlocking ? '验证中...' : '验证'}
            </button>
          </>
        )}
        {unlockError && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>{unlockError}</p>}
      </div>
    );
  }

  // Unlocked views
  if (view === 'detail' && selectedId !== null) {
    return (
      <CredentialDetailView
        credentialId={selectedId}
        onBack={() => { setView('list'); setSelectedId(null); }}
        onEdit={() => setView('edit')}
        onFill={handleFill}
        onDeleted={() => { setView('list'); setSelectedId(null); }}
      />
    );
  }

  if (view === 'create') {
    return (
      <CredentialForm
        mode="create"
        onBack={() => setView('list')}
        onSaved={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && selectedId !== null) {
    return (
      <CredentialForm
        mode="edit"
        credentialId={selectedId}
        onBack={() => setView('detail')}
        onSaved={() => setView('detail')}
      />
    );
  }

  // List view (default)
  return (
    <div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>Password Manager</span>
        <button onClick={() => setView('create')} style={btnSmall} title="新建凭证">＋</button>
      </div>
      <QuickSearch
        onSelect={(cred) => { setSelectedId(cred.id); setView('detail'); }}
        onFill={handleFill}
      />
      {fillStatus && (
        <p style={{ padding: '6px 12px', fontSize: '12px', color: fillStatus.startsWith('✅') ? '#38a169' : '#e53e3e' }}>
          {fillStatus}
        </p>
      )}
    </div>
  );
}

const centerStyle: React.CSSProperties = { padding: '24px', textAlign: 'center', color: '#888' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' };
const btnPrimary: React.CSSProperties = { width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#4285f4', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const btnSmall: React.CSSProperties = { padding: '2px 8px', fontSize: '16px', fontWeight: 600, color: '#4285f4', backgroundColor: 'transparent', border: '1px solid #4285f4', borderRadius: '4px', cursor: 'pointer' };
