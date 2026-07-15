import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!playerRef.current) {
      // Create the <video> element ourselves and attach it to the container
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      containerRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        controls: true,
        fluid: true,
        preload: "metadata",
        sources: [{ src, type: "video/mp4" }],
      }));
    } else {
      // Player already exists — just update the source
      const player = playerRef.current;
      player.src({ src, type: "video/mp4" });
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
    <div className="video-player-wrapper" style={{ marginBottom: "1.5rem" }}>
      <div ref={containerRef} data-vjs-player></div>
    </div>
  );
}