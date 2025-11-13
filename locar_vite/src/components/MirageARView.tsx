// components/MirageARView.tsx
import React, { useEffect, useRef, useState } from 'react';
import { MirageARManager } from './MirageARManager.ts';
import LogoutButton from './LogoutButton.tsx';
import QuestionBox from "./QuestionBox.tsx";
import { checkAnswer } from '../services/firestoreGeoQuery';
import type { NearbyMirage } from '../services/firestoreGeoQuery';
import { useAuth } from '../context/AuthContext';
// import type { User } from "firebase/auth";

interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

const MirageARView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<MirageARManager | null>(null);
  const currentPositionRef = useRef<UserPosition | null>(null);
  const [selectedCube, setSelectedCube] = useState<NearbyMirage | null>(null);
  const [isQuestionBoxOpen, setIsQuestionBoxOpen] = useState(false);
  const { user } = useAuth();

  const handleCubeClick = (cubeData: NearbyMirage) => {
    console.log('[AR] Cube selected:', {
      questionId: cubeData.id,
      question: cubeData.question,
      position: { lat: cubeData.lat, lng: cubeData.lng },
      timestamp: new Date().toISOString()
    });
    setSelectedCube(cubeData);
    setIsQuestionBoxOpen(true);
  };

  useEffect(() => {
    if (containerRef.current) {
      managerRef.current = new MirageARManager(containerRef.current, handleCubeClick, user);
    }

    return () => {
      managerRef.current?.destroy();
    };
  }, [user]);

  const handleQuestionBoxClose = async (questionId?: string, answer?: string) => {
    if (questionId == undefined || answer == undefined) return;
    
    // Validate user authentication
    if (!user?.uid) {
      console.error('[Error] User not authenticated');
      alert('You must be logged in to answer questions.');
      setIsQuestionBoxOpen(false);
      return;
    }
    
    // Get current position from AR manager
    const position = managerRef.current?.ev?.position;
    
    // Validate position data
    if (!position?.coords?.latitude || !position?.coords?.longitude) {
      console.error('[Error] Position data unavailable');
      alert('Unable to get your location. Please ensure location services are enabled and try again.');
      return;
    }
    
    // Store position for reference
    const userPosition: UserPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy || 999,
      timestamp: position.timestamp || Date.now()
    };
    
    currentPositionRef.current = userPosition;
    
    // Check position age (warn if older than 10 seconds)
    const positionAge = Date.now() - userPosition.timestamp;
    if (positionAge > 10000) {
      console.warn('[Warning] Position data is stale', { ageMs: positionAge });
    }
    
    console.log('[API] Submitting answer:', {
      questionId,
      answer: answer.substring(0, 20) + (answer.length > 20 ? '...' : ''), // Log partial answer for privacy
      userId: user.uid,
      userPosition: {
        lat: userPosition.lat,
        lng: userPosition.lng,
        accuracy: userPosition.accuracy,
        age: positionAge
      },
      timestamp: new Date().toISOString()
    });
    
    try {
      let reply = await checkAnswer({
        questionId,
        answer,
        userId: user.uid,
        lat: userPosition.lat,
        lng: userPosition.lng,
      })
      
      if (reply.correct) {
        console.log('[API] Answer correct:', {
          questionId,
          nextHint: reply.nextHint,
          timestamp: new Date().toISOString()
        });
        setIsQuestionBoxOpen(false);
        setSelectedCube(null);
        alert("✅ Correct! Next hint: " + reply?.nextHint);
      } else {
        console.warn('[API] Answer failed:', {
          questionId,
          errorType: reply.errorType,
          message: reply.message,
          distance: reply.distance,
          timestamp: new Date().toISOString()
        });
        
        // Keep question box open for certain errors to allow retry
        if (reply.errorType === "Out of range" || reply.errorType === "Incorrect") {
          // Show error but keep question box open for retry
          alert(reply.message);
        } else {
          // Close question box for errors that can't be retried
          setIsQuestionBoxOpen(false);
          setSelectedCube(null);
          alert(reply.message);
        }
      }
    } catch (error) {
      console.error('[Error] Exception in handleQuestionBoxClose:', {
        error,
        questionId,
        timestamp: new Date().toISOString()
      });
      alert("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <>
      {isQuestionBoxOpen && selectedCube && (
        <QuestionBox
          open={isQuestionBoxOpen}
          setopen={setIsQuestionBoxOpen}
          question={selectedCube.question}
          onClose={handleQuestionBoxClose}
          id={selectedCube.id}
        />
      )}
      <LogoutButton />
      <div
        ref={containerRef}
        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}
      />
    </>
  );
};

export default MirageARView;

