// components/MirageARView.tsx
import React, { useEffect, useRef } from 'react';
import { MirageARManager } from './MirageARManager.ts';
import LogoutButton from './LogoutButton.tsx';

const MirageARView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<MirageARManager | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      managerRef.current = new MirageARManager(containerRef.current);
    }

    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  return (
    <>
    <LogoutButton/>
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}
      />
      </>
  );
};

export default MirageARView;