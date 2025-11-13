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
  const mobileAndTabletCheck = () => {
    let check = false;
    // @ts-ignore
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||"opera" in window);
    return check;
  };

  if (!mobileAndTabletCheck()) return <div className="w-screen h-screen bg-[#353535] text-white flex items-center justify-center">Please use a mobile phone</div>
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

