// components/MirageARView.tsx
import React, { useEffect, useRef } from 'react';
import { MirageARManager } from './MirageARManager.ts';
import LogoutButton from './LogoutButton.tsx';
import QuestionBox from "./QuestionBox.tsx";

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

  let [open, setOpen] = React.useState(true);
  let [question, setQuestion] = React.useState("Is this a sample question?");

  return (
    <>
    <QuestionBox open={open} setopen={setOpen} question={question} onClose={(answer)=>{
      console.log("Here I printed some data");
    }}/>
    <LogoutButton/>
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}
      />
      </>
  );
};

export default MirageARView;

