import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Profile() {
  const [profile, setProfile] = useState({ name: '', bio: '', profile_pic: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/learner/profile')
      .then((res) => {
        setProfile({
          name: res.data.name || '',
          bio: res.data.bio || '',
          profile_pic: res.data.profile_pic || ''
        });
      })
      .catch((err) => {
        console.error("Failed to load profile", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/learner/profile', profile);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="container animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>My Profile</h1>
        
        <div className="card-glass" style={{ padding: '2rem' }}>
          {message && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              borderRadius: '8px',
              backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
            {profile.profile_pic ? (
              <img 
                src={profile.profile_pic} 
                alt="Profile" 
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div>
              <h3 style={{ margin: 0 }}>Avatar Preview</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Enter a valid image URL below to update.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Name</label>
              <input 
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Your full name"
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Profile Picture URL</label>
              <input 
                type="url"
                name="profile_pic"
                value={profile.profile_pic}
                onChange={handleChange}
                className="form-control"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Bio</label>
              <textarea 
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                className="form-control"
                placeholder="Tell us a little about yourself"
                rows="4"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
