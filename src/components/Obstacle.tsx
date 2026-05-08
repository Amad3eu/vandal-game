import { useEffect, useMemo, useState } from "react";
import { Obstacle } from "../types/game";
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
import "./Obstacle.css";

interface ObstaclesProps {
  obstacles: Obstacle[];
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

export default function Obstacles({ obstacles }: ObstaclesProps) {
  return (
    <div className="obstacles">
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={`obstacle obstacle-${obstacle.type}`}
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
          ) : obstacle.type === "floating-platform" || obstacle.type === "train" ? (
            <>
              <TrainSprite />
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
