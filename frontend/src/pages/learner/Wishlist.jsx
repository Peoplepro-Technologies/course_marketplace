import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

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
      <div className="container animate-fade-in">
        <h1 style={{ marginBottom: '2rem' }}>My Wishlist</h1>
        
        {wishlist.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <p>Your wishlist is empty.</p>
            <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              Explore Courses
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {wishlist.map(item => (
              <div key={item.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column' }}>
                {item.course_thumbnail ? (
                  <img src={item.course_thumbnail} alt={item.course_title} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                ) : (
                  <div style={{ width: '100%', height: '160px', background: 'var(--color-bg-secondary)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2rem' }}>📚</span>
                  </div>
                )}
                
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
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
                      className="btn btn-outline" 
                      onClick={() => removeFromWishlist(item.course_id)}
                      style={{ padding: '0.5rem 1rem' }}
                      title="Remove from Wishlist"
                    >
                      ❤️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
