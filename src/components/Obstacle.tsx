import { memo, useEffect, useMemo, useState } from "react";
import { Obstacle } from "../types/game";
import { KIND_ICON, type EncounterArtist } from "../data/encounters";
import { CONE_SPACING, CONE_WIDTH } from "../game/config";
import PixelPerson from "./PixelPerson";
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
  /** Who each graffiti-artist obstacle is (by obstacle id; see src/data/encounters.ts). */
  artists?: Map<number, EncounterArtist>;
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

/**
 * A street artist standing on the sidewalk; DJs, MCs and b-boys/b-girls carry their icon over the
 * head. Once met they wave as the player runs past.
 */
function GraffitiArtistSprite({ artist, met }: { artist?: EncounterArtist; met?: boolean }) {
  const kind = artist?.kind ?? "graffiti";
  return (
    <div className="graffiti-artist">
      {met ? <span className="artist-wave">👋</span> : kind !== "graffiti" && <span className="artist-kind-icon">{KIND_ICON[kind]}</span>}
      {kind === "graffiti" && <span className="artist-spray-mist" style={{ background: artist?.color ?? "#ff4d9d" }} />}
      <PixelPerson className="artist-person" id={artist?.id ?? "remo"} color={artist?.color ?? "#FF6B6B"} kind={kind} />
    </div>
  );
}

/**
 * Ramp up to a train roof: a steel slope with hazard stripes along its edge. The slope is the
 * box's diagonal (where the player walks); the base goes 8px further down, to the street.
 */
const RampSprite = memo(function RampSprite({ id }: { id: number }) {
  const stripes = `ramp-stripes-${id}`;
  return (
    <svg className="ramp-sprite" viewBox="0 0 180 138" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={stripes} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="#ffd23f" />
          <rect x="7" width="7" height="14" fill="#140f1f" />
        </pattern>
      </defs>
      <polygon points="0,130 180,0 180,138 0,138" fill="#3b4150" stroke="#140f1f" strokeWidth="3" />
      {[45, 90, 135].map((x) => (
        <line key={x} x1={x} y1={130 - (x / 180) * 130 + 6} x2={x} y2="138" stroke="#232733" strokeWidth="5" />
      ))}
      <polygon points="0,130 180,0 180,12 14,130" fill={`url(#${stripes})`} stroke="#140f1f" strokeWidth="2" />
    </svg>
  );
});

/** Orange traffic cones with white bands, as many as fit the obstacle. */
const ConesSprite = memo(function ConesSprite({ width, height }: { width: number; height: number }) {
  const count = Math.max(1, Math.round((width + CONE_SPACING) / (CONE_WIDTH + CONE_SPACING)));
  return (
    <svg className="cones-sprite" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const x = i * (CONE_WIDTH + CONE_SPACING);
        const tip = x + CONE_WIDTH / 2;
        return (
          <g key={i}>
            <polygon points={`${tip - 4},2 ${tip + 4},2 ${x + CONE_WIDTH - 3},${height - 7} ${x + 3},${height - 7}`} fill="#ff7a1a" stroke="#140f1f" strokeWidth="2" />
            <polygon points={`${tip - 7},${height * 0.32} ${tip + 7},${height * 0.32} ${tip + 9},${height * 0.46} ${tip - 9},${height * 0.46}`} fill="#fff" />
            <polygon points={`${tip - 11},${height * 0.6} ${tip + 11},${height * 0.6} ${tip + 12.5},${height * 0.72} ${tip - 12.5},${height * 0.72}`} fill="#fff" />
            <rect x={x} y={height - 8} width={CONE_WIDTH} height="7" rx="2" fill="#2d2a3e" stroke="#140f1f" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
});

/**
 * A site hoarding hanging on chains over the street, as tall as the obstacle (hitting any of it
 * ends the run) with an "OBRA" sign at its bottom edge: duck under it.
 */
const DuckBarSprite = memo(function DuckBarSprite({ height }: { height: number }) {
  const signTop = height - 46;
  return (
    <svg className="duck-bar-sprite" viewBox={`0 -400 76 ${height + 400}`} preserveAspectRatio="none" aria-hidden="true">
      {[16, 60].map((x) => (
        <line key={x} x1={x} y1="-400" x2={x} y2="4" stroke="#5b5170" strokeWidth="4" strokeDasharray="7 4" />
      ))}
      <rect x="4" y="0" width="68" height={signTop + 2} fill="#4a3f5c" stroke="#140f1f" strokeWidth="3" />
      {[25, 50].map((x) => (
        <line key={x} x1={x} y1="3" x2={x} y2={signTop} stroke="#3a3149" strokeWidth="2" />
      ))}
      <text x="38" y={signTop / 2 + 7} textAnchor="middle" fontFamily="Bungee, Impact, sans-serif" fontSize="20" fill="#ff4d9d" transform={`rotate(-90 38 ${signTop / 2})`}>
        VANDAL
      </text>
      <rect x="2" y={signTop} width="72" height="44" rx="4" fill="#ffd23f" stroke="#140f1f" strokeWidth="3" />
      <rect x="6" y={signTop + 4} width="64" height="10" fill="#140f1f" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <polygon key={i} points={`${8 + i * 11},${signTop + 14} ${14 + i * 11},${signTop + 4} ${18 + i * 11},${signTop + 4} ${12 + i * 11},${signTop + 14}`} fill="#ffd23f" />
      ))}
      <text x="38" y={signTop + 36} textAnchor="middle" fontFamily="Bungee, Impact, sans-serif" fontSize="17" fill="#140f1f">
        OBRA
      </text>
    </svg>
  );
});

export default function Obstacles({ obstacles, tagProgress = 1, artists }: ObstaclesProps) {
  return (
    <div className="obstacles">
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={`obstacle obstacle-${obstacle.type} ${obstacle.reached ? "reached" : ""} ${obstacle.knocked ? "knocked" : ""}`}
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
            <DuckBarSprite height={obstacle.height} />
          ) : obstacle.type === "ramp" ? (
            <RampSprite id={obstacle.id} />
          ) : obstacle.type === "cone" ? (
            <ConesSprite width={obstacle.width} height={obstacle.height} />
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
              <GraffitiArtistSprite artist={artists?.get(obstacle.id)} met={obstacle.met} />
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
