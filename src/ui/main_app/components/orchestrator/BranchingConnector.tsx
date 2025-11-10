'use client';

interface BranchingConnectorProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  active?: boolean;
}

export default function BranchingConnector({ fromX, fromY, toX, toY, active = false }: BranchingConnectorProps) {
  const midY = (fromY + toY) / 2;
  const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
  
  // Enhanced glow colors
  const baseGlowColor = active ? '#00D9FF' : 'rgba(255, 255, 255, 0.4)';
  const activeGlowColor = '#00D9FF';
  
  return (
    <>
      {/* Base glow layer - always visible */}
      <path
        d={path}
        fill="none"
        stroke={active ? activeGlowColor : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth={active ? '5' : '3'}
        opacity="1"
        style={{ 
          filter: active 
            ? `drop-shadow(0 0 20px ${activeGlowColor}) drop-shadow(0 0 10px ${activeGlowColor}) drop-shadow(0 0 5px ${activeGlowColor})`
            : `drop-shadow(0 0 12px rgba(255, 255, 255, 0.3)) drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))`
        }}
      />
      {/* Animated pulse layer for active connections */}
      {active && (
        <>
          <path
            d={path}
            fill="none"
            stroke={activeGlowColor}
            strokeWidth="4"
            strokeDasharray="10 5"
            opacity="0.8"
            className="animate-[flow-energy_2s_linear_infinite]"
            style={{ 
              filter: `drop-shadow(0 0 24px ${activeGlowColor}) drop-shadow(0 0 12px ${activeGlowColor}) drop-shadow(0 0 6px ${activeGlowColor})`
            }}
          />
              {/* Additional pulsing glow layer */}
          <path
            d={path}
            fill="none"
            stroke={activeGlowColor}
            strokeWidth="2"
            opacity="0.6"
            className="animate-pulse"
            style={{ 
              filter: `drop-shadow(0 0 30px ${activeGlowColor}) drop-shadow(0 0 15px ${activeGlowColor})`
            }}
          />
        </>
      )}
    </>
  );
}
