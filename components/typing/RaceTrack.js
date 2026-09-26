"use client";

import CarIcon from "./CarIcon";

export default function RaceTrack({ players = [], myId = null, t = null }) {
  return (
    <div className="trackContainer">
      <div className="trackHeader">
        <span className="trackTitle">{t?.raceTrackHeader || "🏎️ RACE TRACK"}</span>
        <span className="finishLabel">{t?.finishHeader || "🏁 FINISH"}</span>
      </div>

      <div className="trackRoad">
        {/* Checkered Finish Line Pattern on the Right */}
        <div className="finishStrip" />

        {players.map((player, idx) => {
          const isMe = player.id === myId;
          const progressPercent = Math.min(100, Math.max(0, player.progress || 0));
          const isHighSpeed = (player.wpm || 0) >= 60;

          return (
            <div key={player.id || idx} className={`trackLane ${isMe ? "myLane" : ""}`}>
              {/* Lane Info Header */}
              <div className="laneInfo">
                <span className="laneRacerName" style={{ color: player.color }}>
                  {isMe && <span className="meTag">{t?.youTag || "YOU"}</span>}
                  {player.nickname}
                  {player.isBot && <span className="botTag">{t?.botTag || "BOT"}</span>}
                </span>

                <div className="laneStats">
                  <span className="laneWpm">{Math.round(player.wpm || 0)} WPM</span>
                  {player.rank && (
                    <span className="laneRankBadge">
                      {player.rank === 1 ? "🥇 1st" : player.rank === 2 ? "🥈 2nd" : player.rank === 3 ? "🥉 3rd" : `${player.rank}th`}
                    </span>
                  )}
                </div>
              </div>

              {/* Lane Surface & Car */}
              <div className="laneRoadSurface">
                <div
                  className="carMotionTrack"
                  style={{
                    transform: `translateX(${progressPercent}%)`,
                    transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.4, 1)",
                  }}
                >
                  <CarIcon color={player.color} isNitro={isHighSpeed && progressPercent < 100} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
