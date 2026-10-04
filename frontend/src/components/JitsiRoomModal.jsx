/**
 * JitsiRoomModal.jsx
 *
 * Renders an overlay that embeds a Jitsi Meet room using the
 * Jitsi External API (loaded dynamically from meet.jit.si).
 *
 * Props:
 *   roomName   - Unique Jitsi room name (e.g. "coursemkt-abc123")
 *   displayName - The participant's display name
 *   onClose    - Callback fired when the user leaves / clicks X
 */

import { useEffect, useRef } from 'react';
import './JitsiRoomModal.css';

const JITSI_DOMAIN = 'meet.jit.si';
const JITSI_SCRIPT_URL = 'https://meet.jit.si/external_api.js';

function loadJitsiScript() {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = JITSI_SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function JitsiRoomModal({ roomName, displayName, onClose }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    loadJitsiScript()
      .then(() => {
        if (!mounted || !containerRef.current) return;

        apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          userInfo: {
            displayName: displayName || 'Participant',
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableNoisyMicDetection: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'chat', 'tileview',
              'select-background', 'raisehand',
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            BRAND_WATERMARK_LINK: '',
            MOBILE_APP_PROMO: false,
          },
        });

        apiRef.current.addEventListeners({
          readyToClose: () => {
            if (mounted) onClose();
          },
          videoConferenceLeft: () => {
            if (mounted) onClose();
          },
        });
      })
      .catch((err) => console.error('Jitsi load error:', err));

    return () => {
      mounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, onClose]);

  return (
    <div className="jitsi-modal-overlay">
      <button className="jitsi-close-btn" onClick={onClose} title="Leave meeting">
        ✕ Leave
      </button>
      <div className="jitsi-container" ref={containerRef} />
    </div>
  );
}
