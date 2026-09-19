import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BookOpen, HeartOff } from 'lucide-react';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = () => {
    api.get('/learner/wishlist')
      .then((res) => {
        setWishlist(res.data);
      })
      .catch((err) => {
        console.error("Failed to load wishlist", err);
      })
      .finally(() => setLoading(false));
  };

  const removeFromWishlist = async (courseId) => {
    try {
      await api.delete(`/learner/wishlist/${courseId}`);
      setWishlist(wishlist.filter(w => w.course_id !== courseId));
    } catch (err) {
      alert("Failed to remove course");
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <h2>My Wishlist</h2>
        <p>Courses you've saved for later</p>
      </div>
      
      {wishlist.length === 0 ? (
        <EmptyState 
          icon={HeartOff}
          title="Your wishlist is empty"
          message="Save courses you're interested in by clicking the heart icon on the course page."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {wishlist.map(item => (
            <div key={item.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              {item.course_thumbnail ? (
                <img src={item.course_thumbnail} alt={item.course_title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '160px', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  <BookOpen size={48} strokeWidth={1} />
                </div>
              )}
              
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{item.course_category}</span>
                    <span style={{ fontWeight: 'bold' }}>${item.course_price}</span>
                  </div>
                  
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{item.course_title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>{item.instructor_name}</p>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/courses/${item.course_id}`} className="btn btn-primary" style={{ flexGrow: 1, textAlign: 'center', padding: '0.5rem' }}>
                      View Course
                    </Link>
                    <button 
                      className="btn btn-outline flex-center" 
                      onClick={() => removeFromWishlist(item.course_id)}
                      style={{ padding: '0.5rem', width: '40px' }}
                      title="Remove from Wishlist"
                    >
                      <HeartOff size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
