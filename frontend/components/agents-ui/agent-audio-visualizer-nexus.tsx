'use client';

import React, { useEffect, useRef } from 'react';
import { type AgentState } from '@livekit/components-core';

export interface AgentAudioVisualizerNexusProps extends React.HTMLAttributes<HTMLCanvasElement> {
  state: AgentState;
}

export const AgentAudioVisualizerNexus = React.forwardRef<HTMLCanvasElement, AgentAudioVisualizerNexusProps>(
  ({ state, className, ...props }, forwardedRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let cw = (canvas.width = canvas.parentElement?.clientWidth || 300);
      let ch = (canvas.height = canvas.parentElement?.clientHeight || 300);

      const resizeObserver = new ResizeObserver(() => {
        cw = canvas.width = canvas.parentElement?.clientWidth || 300;
        ch = canvas.height = canvas.parentElement?.clientHeight || 300;
      });
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }

      let particles: any[] = [];
      for (let i = 0; i < 60; i++) {
        particles.push({
          angle: Math.random() * Math.PI * 2,
          dist: Math.random() * 200,
          speed: 0.2 + Math.random() * 1,
          size: Math.random() * 2,
        });
      }

      let time = 0;
      let animationFrameId: number;

      const renderNexus = () => {
        time += 0.01 * (state === 'speaking' || state === 'thinking' ? 3 : 1);

        ctx.clearRect(0, 0, cw, ch);
        const cx = cw / 2;
        const cy = ch / 2;

        let radiusPulse =
          state === 'listening' || state === 'speaking' || state === 'thinking'
            ? Math.sin(time * 15) * 12
            : 0;
        let ringTilt = 1; // You can add logic for 'vision' state if needed

        // Ambient Data Dust
        ctx.fillStyle = '#00E5FF';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#00E5FF';
        particles.forEach((p) => {
          p.dist += p.speed * (state === 'thinking' ? 3 : 1);
          if (p.dist > 300) p.dist = 0;
          let px = cx + Math.cos(p.angle) * p.dist;
          let py = cy + Math.sin(p.angle) * p.dist;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // Central Fusion Core (Glowing Sun)
        let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 + radiusPulse);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, '#FFF7A0');
        gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#FFA500';
        ctx.beginPath();
        ctx.arc(cx, cy, 90 + radiusPulse, 0, Math.PI * 2);
        ctx.fill();

        // Radial Energy Rays (Orange)
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF8C00';
        ctx.lineWidth = 1.5;
        let numRays = 16;
        for (let i = 0; i < numRays; i++) {
          let angle = (i / numRays) * Math.PI * 2 + time;
          let length = 110 + Math.sin(time * 5 + i) * 30 + radiusPulse;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * 40, cy + Math.sin(angle) * 40);
          ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
          ctx.stroke();
        }

        // Blue Neural Rings (3D Parametric Simulation)
        ctx.strokeStyle = '#00E5FF';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00E5FF';
        ctx.lineWidth = 2;

        const drawRing = (rx: number, ry: number, rot: number, dashOffset: number) => {
          ctx.setLineDash([10, 15, 40, 10]);
          ctx.lineDashOffset = dashOffset;
          ctx.beginPath();
          let actualRot = ringTilt ? rot : 0;
          let actualRy = ringTilt ? ry : rx;
          ctx.ellipse(
            cx,
            cy,
            rx + radiusPulse,
            actualRy + radiusPulse,
            actualRot,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        };

        drawRing(190, 70, time * 0.5, -time * 50);
        drawRing(170, 100, -time * 0.3, time * 60);
        drawRing(210, 50, Math.PI / 4 + time * 0.2, -time * 40);

        ctx.setLineDash([]); // reset dashes

        // Orange Quantum Geodesic Inner Ring
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.9)';
        ctx.shadowColor = '#FFA500';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 100 + radiusPulse, 100 + radiusPulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        animationFrameId = requestAnimationFrame(renderNexus);
      };

      animationFrameId = requestAnimationFrame(renderNexus);

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
      };
    }, [state]);

    return (
      <canvas
        ref={(node) => {
          (canvasRef as any).current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) (forwardedRef as any).current = node;
        }}
        className={className}
        {...props}
      />
    );
  }
);
AgentAudioVisualizerNexus.displayName = 'AgentAudioVisualizerNexus';
