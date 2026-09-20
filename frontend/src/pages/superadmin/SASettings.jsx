import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Settings, Save, AlertCircle, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import SASidebarLayout from './SASidebarLayout';

const DEFAULTS = {
  site_name: 'CoursePlatform',
  support_email: 'support@courseplatform.com',
  maintenance_mode: 'false',
};

export default function SASettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/superadmin/settings')
      .then(res => {
        const data = res.data;
        setSettings({ ...DEFAULTS, ...data });
      })
      .catch(() => {
        // If endpoint returns nothing yet just use defaults
        setSettings(DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/superadmin/settings', settings);
      setSaved(true);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <SASidebarLayout>
      <div style={{ padding: '24px' }}>Loading settings...</div>
    </SASidebarLayout>
  );

  const isMaintenance = settings.maintenance_mode === 'true';

  return (
    <SASidebarLayout>
      <div style={{ padding: '24px', maxWidth: '720px' }}>
        <h1 style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} /> Platform Settings
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
          Global configuration for your platform.
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <CheckCircle size={16} /> Settings saved successfully.
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Site Name */}
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
              Site Name
            </label>
            <input
              value={settings.site_name}
              onChange={e => handleChange('site_name', e.target.value)}
              placeholder="Platform display name"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>This name appears in the header and email templates.</p>
          </div>

          {/* Support Email */}
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
              Support Email
            </label>
            <input
              type="email"
              value={settings.support_email}
              onChange={e => handleChange('support_email', e.target.value)}
              placeholder="support@example.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Users will see this address on support pages and notifications.</p>
          </div>

          {/* Maintenance Mode */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>Maintenance Mode</div>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                When enabled, only Super Admins can log in. All other users see a maintenance message.
              </p>
            </div>
            <button
              onClick={() => handleChange('maintenance_mode', isMaintenance ? 'false' : 'true')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                color: isMaintenance ? '#dc2626' : '#16a34a',
                fontWeight: '600', fontSize: '14px',
              }}
            >
              {isMaintenance ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              {isMaintenance ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#0056D2', color: 'white',
              border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontSize: '14px', fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </SASidebarLayout>
  );
}
