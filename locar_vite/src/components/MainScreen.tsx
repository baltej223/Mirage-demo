import { useEffect, useRef } from "react";
import renderer from "./glscene";

export default function MainScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // append renderer canvas if not already appended
    if (renderer.domElement && renderer.domElement.parentElement !== container) {
      container.appendChild(renderer.domElement);
    }

    return () => {
      if (renderer.domElement && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div id="glscene" ref={containerRef} />
    </>
  );
}