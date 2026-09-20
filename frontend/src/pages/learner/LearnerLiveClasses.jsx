/**
 * LearnerLiveClasses.jsx — Learner-side view of live classes and recordings.
 *
 * Features:
 *   - Lists all approved-enrolled courses and their upcoming, live, and ended sessions
 *   - Countdown timer ("Starts in X minutes") for scheduled sessions
 *   - "Join" button enabled when status is "live"
 *   - "Watch Recording" button enabled for ended sessions with a ready recording
 *   - Opens VideoPlayer in modal to stream recording securely with token auth
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import JitsiRoomModal from '../../components/JitsiRoomModal';
import VideoPlayer from '../../components/VideoPlayer';
import Modal from '../../components/Modal';
import keycloak from '../../auth/keycloak';
import { Video, RefreshCw, GraduationCap, Calendar, BookOpen, Clock, Play } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

function useCountdown(scheduledAt) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function update() {
      const now = Date.now();
      const target = new Date(scheduledAt).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setLabel('Starting soon…');
        return;
      }
      const totalMinutes = Math.floor(diff / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 0) {
        setLabel(`Starts in ${hours}h ${mins}m`);
      } else if (mins > 0) {
        setLabel(`Starts in ${mins} min`);
      } else {
        setLabel('Starts in < 1 min');
      }
    }
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [scheduledAt]);

  return label;
}

function LiveClassCard({ lc, onJoin, onWatchRecording }) {
  const countdown = useCountdown(lc.scheduled_at);
  const isLive = lc.status === 'live';
  const isEnded = lc.status === 'ended';
  const hasRecording = lc.recording_status === 'ready';

  const scheduled = new Date(lc.scheduled_at);
  const dateStr = scheduled.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: `1.5px solid ${isLive ? '#22c55e' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: isLive ? '0 0 0 3px rgba(34,197,94,0.18)' : 'var(--shadow-sm)',
      transition: 'box-shadow 0.2s',
      position: 'relative',
    }}>
      {/* Live pulse indicator */}
      {isLive && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 0 3px rgba(34,197,94,0.35)',
            animation: 'pulse-live 1.5s infinite',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#15803d' }}>LIVE</span>
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-md)',
        background: isLive ? '#dcfce7' : isEnded ? '#f1f5f9' : 'var(--color-bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isLive ? '#22c55e' : 'var(--color-text-muted)',
        flexShrink: 0,
      }}>
        <Video size={24} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, lineHeight: 1.4 }}>
          {lc.title}
        </h4>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          {dateStr} · {lc.duration_minutes} min
        </div>
        {!isLive && (
          <div style={{ fontSize: 'var(--text-xs)', color: '#0369a1', fontWeight: 600, marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {countdown}
          </div>
        )}
        {isEnded && (
          <div style={{ fontSize: 'var(--text-xs)', color: hasRecording ? '#15803d' : 'var(--color-text-muted)', fontWeight: 600, marginTop: '0.3rem' }}>
            {hasRecording ? '✓ Recording Available' : 'Session ended'}
          </div>
        )}
      </div>

      {/* Join button */}
      <button
        id={`learner-join-live-class-${lc.id}`}
        className={`btn ${isLive ? 'btn-success' : 'btn-secondary'} btn-sm flex-center`}
        disabled={!isLive}
        onClick={() => isLive && onJoin(lc)}
        title={isLive ? 'Join live session' : 'Session not started yet'}
        style={{
          minWidth: 100,
          opacity: isLive ? 1 : 0.55,
          cursor: isLive ? 'pointer' : 'not-allowed',
          gap: '6px'
        }}
      >
        {isLive && <Play size={14} />} {isLive ? 'Join Now' : 'Not Started'}
      </button>
    </div>
  );
}

export default function LearnerLiveClasses() {
  const [enrollments, setEnrollments] = useState([]);
  const [classesByCourse, setClassesByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [jitsiRoom, setJitsiRoom] = useState(null);
  const [recordingModalClass, setRecordingModalClass] = useState(null);

  const displayName = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'Student';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const enrollRes = await api.get('/learner/courses');
      const approved = enrollRes.data.filter(e => e.enrollment_status === 'approved');
      setEnrollments(approved);

      // Fetch live classes for each approved course
      const entries = await Promise.allSettled(
        approved.map(async (e) => {
          const res = await api.get(`/learner/courses/${e.course_id}/live-classes`);
          return { courseId: e.course_id, classes: res.data };
        })
      );

      const map = {};
      entries.forEach(result => {
        if (result.status === 'fulfilled') {
          map[result.value.courseId] = result.value.classes;
        }
      });
      setClassesByCourse(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds to pick up status changes
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleJoin = (lc) => {
    setJitsiRoom({ roomName: lc.room_name, displayName });
  };

  const handleWatchRecording = (lc) => {
    setRecordingModalClass(lc);
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  const hasAnyClasses = enrollments.some(e =>
    (classesByCourse[e.course_id] || []).length > 0
  );

  return (
    <>
      {/* Jitsi Meeting Modal */}
      {jitsiRoom && (
        <JitsiRoomModal
          roomName={jitsiRoom.roomName}
          displayName={jitsiRoom.displayName}
          onClose={() => setJitsiRoom(null)}
        />
      )}

      {/* Watch Recording Video Modal */}
      <Modal
        isOpen={Boolean(recordingModalClass)}
        onClose={() => setRecordingModalClass(null)}
        title={`Class Recording — ${recordingModalClass?.title || ''}`}
      >
        {recordingModalClass && (
          <VideoPlayer
            src={`http://localhost:8000/api/v1/learner/live-classes/${recordingModalClass.id}/recording?token=${keycloak.token}`}
          />
        )}
      </Modal>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-live {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.35); }
          50% { box-shadow: 0 0 0 7px rgba(34,197,94,0.10); }
        }
      `}</style>

      <div className="page-wrapper">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Video size={24} /> Live Classes</h2>
            <p>Join live sessions hosted by your instructors.</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={fetchData}
            id="learner-refresh-live-classes-btn"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {enrollments.length === 0 ? (
          <EmptyState 
            icon={GraduationCap}
            title="No approved enrollments"
            message="You need an approved enrollment to view live classes."
          />
        ) : !hasAnyClasses ? (
          <EmptyState 
            icon={Calendar}
            title="No upcoming live sessions"
            message="Your instructors haven't scheduled any live classes yet. Check back soon!"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {enrollments.map(enrollment => {
              const classes = classesByCourse[enrollment.course_id] || [];
              if (classes.length === 0) return null;

              return (
                <div key={enrollment.course_id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}>
                    {enrollment.course_thumbnail ? (
                      <img
                        src={enrollment.course_thumbnail}
                        alt={enrollment.course_title}
                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 6,
                        background: 'var(--color-bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-text-muted)'
                      }}><BookOpen size={20} /></div>
                    )}
                    <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                      {enrollment.course_title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {classes.map(lc => (
                      <LiveClassCard
                        key={lc.id}
                        lc={lc}
                        onJoin={handleJoin}
                        onWatchRecording={handleWatchRecording}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
