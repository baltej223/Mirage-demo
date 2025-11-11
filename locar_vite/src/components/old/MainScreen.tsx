import { useEffect, useRef } from "react";
import { MirageARManager } from "../MirageARManager.ts" // Adjust path as needed based on project structure

export default function MainScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const arManagerRef = useRef<MirageARManager | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize AR manager
    arManagerRef.current = new MirageARManager(container);

    return () => {
      // Cleanup on unmount
      if (arManagerRef.current) {
        arManagerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
  );
}
