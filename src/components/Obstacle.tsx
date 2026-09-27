import { useEffect, useMemo, useState } from "react";
import { Obstacle, GraffitiArtist } from "../types/game";
import powerJumpIcon from "../assets/sprites/powerups/power-jump.svg";
import powerLightningIcon from "../assets/sprites/powerups/power-lightning.svg";
import sprayFrame1 from "../assets/sprites/Spray/Sprite-0004.png";
import sprayFrame2 from "../assets/sprites/Spray/Sprite-0005.png";
import sprayFrame3 from "../assets/sprites/Spray/Sprite-0006.png";
import sprayFrame4 from "../assets/sprites/Spray/Sprite-0007.png";
import sprayFrame5 from "../assets/sprites/Spray/Sprite-0008.png";
import sprayFrame6 from "../assets/sprites/Spray/Sprite-0009.png";
import sprayFrame7 from "../assets/sprites/Spray/Sprite-0010.png";
import trainFrame1 from "../assets/sprites/Train/Sprite-0002.png";
import trainFrame2 from "../assets/sprites/Train/Sprite-0003.png";
import trainFrame3 from "../assets/sprites/Train/Sprite-0004.png";
import trainFrame4 from "../assets/sprites/Train/Sprite-0005.png";
import trainFrame5 from "../assets/sprites/Train/Sprite-0006.png";
import trainFrame6 from "../assets/sprites/Train/Sprite-0007.png";
import wallBricks from "../assets/sprites/intro/wall.png";
import wallTag from "../assets/sprites/intro/tag.png";
import "./Obstacle.css";

interface ObstaclesProps {
  obstacles: Obstacle[];
  /** How much of the intro wall's tag is painted (0..1). */
  tagProgress?: number;
}

function SpraySprite() {
  const frames = useMemo(
    () => [
      sprayFrame1,
      sprayFrame2,
      sprayFrame3,
      sprayFrame4,
      sprayFrame5,
      sprayFrame6,
      sprayFrame7,
    ],
    [],
  );
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 90);

    return () => window.clearInterval(interval);
  }, [frames.length]);

  return (
    <img
      src={frames[frameIndex]}
      alt="Spray obstacle"
      className="spray-sprite"
      draggable={false}
    />
  );
}

function TrainSprite() {
  const frames = useMemo(
    () => [
      trainFrame1,
      trainFrame2,
      trainFrame3,
      trainFrame4,
      trainFrame5,
      trainFrame6,
    ],
    [],
  );
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 120);

    return () => window.clearInterval(interval);
  }, [frames.length]);

  return (
    <img
      src={frames[frameIndex]}
      alt="Train platform"
      className="train-sprite"
      draggable={false}
    />
  );
}

function GraffitiArtistSprite({ artist }: { artist?: GraffitiArtist }) {
  const colors: Record<GraffitiArtist, string> = {
    remo: "#FF6B6B",
    pixo: "#4ECDC4",
    nina: "#FFE66D",
  };

  const color = artist ? colors[artist] : "#FF6B6B";

  return (
    <div className="graffiti-artist">
      <div className="artist-head" style={{ backgroundColor: color }} />
      <div className="artist-body" style={{ backgroundColor: color }} />
      <div className="artist-arm artist-arm-left" style={{ backgroundColor: color }} />
      <div className="artist-arm artist-arm-right" style={{ backgroundColor: color }} />
      <div className="artist-leg artist-leg-left" style={{ backgroundColor: color }} />
      <div className="artist-leg artist-leg-right" style={{ backgroundColor: color }} />
    </div>
  );
}

export default function Obstacles({ obstacles, tagProgress = 1 }: ObstaclesProps) {
  return (
    <div className="obstacles">
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={`obstacle obstacle-${obstacle.type} ${obstacle.reached ? "reached" : ""}`}
          style={{
            left: `${obstacle.x}px`,
            top: `${obstacle.type === "spray" ? obstacle.y - 18 : obstacle.y}px`,
            width: `${obstacle.width}px`,
            height: `${obstacle.height}px`,
          }}
        >
          {obstacle.type === "cactus" ? (
            <>
              <SpraySprite />
            </>
          ) : obstacle.type === "bird" ? (
            <>
              <div className="bird-wing bird-wing-left" />
              <div className="bird-body" />
              <div className="bird-eye" />
              <div className="bird-wing bird-wing-right" />
            </>
          ) : obstacle.type === "duck-bar" ? (
            <>
              <SpraySprite />
            </>
          ) : obstacle.type === "train" ? (
            <>
              <TrainSprite />
            </>
          ) : obstacle.type === "floating-platform" ? (
            <>
              <div className="ledge-beam" />
              <div className="ledge-bracket ledge-bracket-left" />
              <div className="ledge-bracket ledge-bracket-right" />
            </>
          ) : obstacle.type === "wall" ? (
            <>
              <img src={wallBricks} alt="" className="wall-bricks" draggable={false} />
              <div className="wall-tag" style={{ clipPath: `inset(0 ${(1 - tagProgress) * 100}% 0 0)` }}>
                <img src={wallTag} alt="" draggable={false} />
              </div>
            </>
          ) : obstacle.type === "checkpoint" ? (
            <>
              <div className="flag-pole" />
              <div className="flag-cloth" />
              <div className="flag-base" />
            </>
          ) : obstacle.type === "trampoline" ? (
            <>
              <div className="trampoline-base" />
              <div className="trampoline-surface" />
              <div className="trampoline-leg trampoline-leg-left" />
              <div className="trampoline-leg trampoline-leg-right" />
            </>
          ) : obstacle.type === "coin" ? (
            <>
              <div className="coin-core" />
              <div className="coin-shine" />
            </>
          ) : obstacle.type === "power-lightning" ? (
            <>
              <img
                src={powerLightningIcon}
                alt="Poder raio"
                className="power-icon-image power-icon-lightning"
                draggable={false}
              />
            </>
          ) : obstacle.type === "power-jump" ? (
            <>
              <img
                src={powerJumpIcon}
                alt="Poder super pulo"
                className="power-icon-image power-icon-jump"
                draggable={false}
              />
            </>
          ) : obstacle.type === "spray" ? (
            <>
              <SpraySprite />
            </>
          ) : obstacle.type === "graffiti-artist" ? (
            <>
              <GraffitiArtistSprite artist={obstacle.graffitiArtist} />
            </>
          ) : obstacle.type === "building" ? (
            <>
              <div className="building-face" />
              <div className="building-roof" />
              <div className="building-tag" />
              <div className="building-windows">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="building-window" />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="skate-deck" />
              <div className="skate-wheel skate-wheel-left" />
              <div className="skate-wheel skate-wheel-right" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
