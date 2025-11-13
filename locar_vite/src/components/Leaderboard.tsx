import React, { useState, useEffect } from "react";
import { getLeaderboard } from "../services/firestoreGeoQuery";

const Login: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<{ name: string; points: number }[]>([]);
  useEffect(() => {
    (async () => {
      setLeaderboard(await getLeaderboard());
    })();
  });
  console.log(leaderboard);

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen bg-gray-50">
    {leaderboard.map(item => (
      <div className="p-4 pt-2 pb-2 flex items-center gap-4 bg-gray-200">
        <div className="text-xl">
          {item.name}
        </div>
        <div className="text-[#f5c749] text-2xl">
          {item.points}
        </div>
      </div>
    ))}
    </div>
  );
};

export default Login;
