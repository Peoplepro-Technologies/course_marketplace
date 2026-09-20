import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { User, CreditCard, Save, AlertCircle } from 'lucide-react';

export default function InstructorProfile() {
  const [form, setForm] = useState({
    name: '',
    bio: '',
    profile_pic: '',
    payout_account_name: '',
    payout_account_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/instructor/profile')
      .then(res => {
        const d = res.data;
        setForm({
          name: d.name || '',
          bio: d.bio || '',
          profile_pic: d.profile_pic || '',
          payout_account_name: d.payout_account_name || '',
          payout_account_number: d.payout_account_number || '',
        });
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/instructor/profile', form);
      setSaved(true);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '720px' }}>
      <h1 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User size={24} /> Profile &amp; Payout
      </h1>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Profile Section */}
      <section style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0056D2' }}>
          <User size={18} /> Personal Info
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Full Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Bio
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              placeholder="A short description about yourself..."
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Profile Picture URL
            <input
              name="profile_pic"
              value={form.profile_pic}
              onChange={handleChange}
              placeholder="https://..."
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
          </label>
        </div>
      </section>

      {/* Payout Section */}
      <section style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0056D2' }}>
          <CreditCard size={18} /> Payout Details
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
          These details are used to process your earnings payouts. Please ensure the name matches your bank account exactly.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Account Holder Name
            <input
              name="payout_account_name"
              value={form.payout_account_name}
              onChange={handleChange}
              placeholder="Account holder full name"
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Account Number
            <input
              name="payout_account_number"
              value={form.payout_account_number}
              onChange={handleChange}
              placeholder="e.g. 1234567890"
              type="text"
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
          </label>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#0056D2', color: 'white',
            border: 'none', borderRadius: '8px',
            padding: '10px 20px', fontSize: '14px', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && (
          <span style={{ color: '#15803d', fontSize: '14px', fontWeight: '500' }}>
            Profile saved successfully.
          </span>
        )}
      </div>
    </div>
  );
}
