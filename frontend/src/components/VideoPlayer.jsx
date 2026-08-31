import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer({ src, onPlayerReady }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setLoading(true);

    if (!playerRef.current) {
      // Create the <video> element ourselves and attach it to the container
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      containerRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        controls: true,
        fluid: true,
        preload: "metadata",
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        sources: [{ src, type: "video/mp4" }],
      }));

      if (onPlayerReady) {
        onPlayerReady(player);
      }

      // Loading state listeners
      player.on("loadstart", () => {
        setLoading(true);
        setError(false);
      });
      player.on("waiting", () => {
        setLoading(true);
      });
      player.on("playing", () => {
        setLoading(false);
      });
      player.on("canplaythrough", () => {
        setLoading(false);
      });
      // Error state listener
      player.on("error", () => {
        setLoading(false);
        setError(true);
      });
    } else {
      // Player already exists — just update the source
      const player = playerRef.current;
      player.src({ src, type: "video/mp4" });
      if (onPlayerReady) {
        onPlayerReady(player);
      }
    }
  }, [src]);


  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="video-player-wrapper" style={{ marginBottom: "1.5rem", position: "relative" }}>
      <div ref={containerRef} data-vjs-player></div>

      {loading && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          zIndex: 10,
          pointerEvents: "none",
          borderRadius: "var(--radius-md, 8px)"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "32px",
              height: "32px",
              border: "3px solid rgba(255, 255, 255, 0.3)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "vjs-spin 0.8s linear infinite",
              margin: "0 auto 0.5rem"
            }} />
            <p style={{ margin: 0, fontSize: "var(--text-sm, 0.875rem)" }}>Video is loading...</p>
          </div>
          <style>{`@keyframes vjs-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-danger, #ef4444)",
          zIndex: 10,
          borderRadius: "var(--radius-md, 8px)"
        }}>
          <div style={{ textAlign: "center", padding: "1.5rem" }}>
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <p style={{ margin: "0.5rem 0 0", fontSize: "var(--text-sm, 0.875rem)", fontWeight: "bold" }}>
              Unable to load video, please try again
            </p>
          </div>
        </div>
      )}
    </div>
  );
}