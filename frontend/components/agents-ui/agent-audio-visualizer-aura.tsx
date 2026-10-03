'use client';

/**
 * @license
 *
 * Originally developed for Unicorn Studio
 * https://unicorn.studio
 *
 * Licensed under the Polyform Non-Resale License 1.0.0
 * https://polyformproject.org/licenses/non-resale/1.0.0/
 *
 * © 2026 UNCRN LLC
 */
import React, { type ComponentProps, useMemo } from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { type LocalAudioTrack, type RemoteAudioTrack } from 'livekit-client';
import { type AgentState, type TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { ReactShaderToy } from '@/components/agents-ui/react-shader-toy';
import { useAgentAudioVisualizerAura } from '@/hooks/agents-ui/use-agent-audio-visualizer-aura';
import { cn } from '@/lib/shadcn/utils';

const DEFAULT_COLOR = '#1FD5F9';

function hexToRgb(hexColor: string) {
  try {
    const rgbColor = hexColor.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);

    if (rgbColor) {
      const [, r, g, b] = rgbColor;
      const color = [r, g, b].map((c = '00') => parseInt(c, 16) / 255);

      return color;
    }
  } catch (error) {
    console.error(
      `Invalid hex color '${hexColor}'.\nFalling back to default color '${DEFAULT_COLOR}'.`
    );
  }

  return hexToRgb(DEFAULT_COLOR);
}

const shaderSource = `
const float TAU = 6.283185;

// Noise for ambient dust
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    float t = iTime * uSpeed;
    
    // Base pulse based on audio amplitude (0 to 1+)
    float pulse = uAmplitude * 0.2;
    float d = length(uv);
    float angle = atan(uv.y, uv.x);
    
    vec3 finalColor = vec3(0.0);
    
    // 1. Central Fusion Core (Glowing Sun)
    // Uses uColor as base, mixed with white/yellow
    vec3 coreBase = mix(uColor, vec3(1.0, 0.9, 0.4), 0.5);
    float coreRadius = 0.1 + pulse;
    float core = 0.02 / max(d - coreRadius, 0.005);
    finalColor += coreBase * core * 0.8;
    
    // 2. Radial Energy Rays
    float numRays = 16.0;
    float rays = sin(angle * numRays + t * 2.0);
    // Sharpen the rays
    rays = smoothstep(0.8, 1.0, rays);
    float rayMask = smoothstep(0.4, 0.1, d);
    finalColor += vec3(1.0, 0.6, 0.1) * rays * rayMask * (pulse * 8.0 + 0.2);
    
    // 3. Blue Neural Rings (3D Parametric Simulation via rotated ellipses)
    vec3 ringColor = vec3(0.0, 0.9, 1.0);
    
    // Ring 1 (Dashed, rotating)
    float r1 = abs(length(uv) - (0.25 + pulse));
    float ring1 = 0.004 / max(r1, 0.002);
    float dash1 = step(0.0, sin(angle * 24.0 - t * 3.0));
    finalColor += ringColor * ring1 * dash1 * 0.6;
    
    // Ring 2 (Elliptical, counter-rotating)
    float s = sin(t * 0.5);
    float c = cos(t * 0.5);
    mat2 rot = mat2(c, -s, s, c);
    vec2 uv2 = rot * uv;
    uv2.x *= 1.5; // Squash X to make ellipse
    float r2 = abs(length(uv2) - (0.35 + pulse));
    float ring2 = 0.004 / max(r2, 0.002);
    float dash2 = step(0.0, sin(angle * 30.0 + t * 4.0));
    finalColor += ringColor * ring2 * dash2 * 0.5;
    
    // Ring 3 (Geodesic Inner Ring)
    float r3 = abs(length(uv) - (0.18 + pulse * 0.5));
    float ring3 = 0.002 / max(r3, 0.001);
    finalColor += vec3(1.0, 0.7, 0.0) * ring3 * 0.4;
    
    // 4. Ambient Data Dust
    vec2 p = uv;
    p.x -= t * 0.1; // flow right
    float dust = smoothstep(0.98, 1.0, hash(floor(p * 50.0)));
    float dustGlow = 0.01 / max(length(fract(p * 50.0) - 0.5), 0.01);
    finalColor += ringColor * dust * dustGlow * (pulse * 2.0 + 0.1);
    
    // Apply uMix for overall brightness and fade edges
    float edgeFade = smoothstep(0.5, 0.2, d);
    finalColor *= uMix * edgeFade;
    
    // Dark mode vs Light mode handling
    if(uMode > 0.5) {
        // Light mode - invert or adjust for white background
        finalColor = clamp(finalColor * 2.0, 0.0, 1.0);
        float alpha = length(finalColor) * 1.5;
        fragColor = vec4(finalColor, min(alpha, 1.0));
    } else {
        // Dark mode
        fragColor = vec4(finalColor, max(length(finalColor), 0.1));
    }
}`;;

interface AuraShaderProps {
  /**
   * Aurora wave speed
   * @default 1.0
   */
  speed?: number;

  /**
   * Turbulence amplitude
   * @default 0.5
   */
  amplitude?: number;

  /**
   * Wave frequency and complexity
   * @default 0.5
   */
  frequency?: number;

  /**
   * Shape scale
   * @default 0.3
   */
  scale?: number;

  /**
   * Shape type: 1=circle, 2=line
   * @default 1
   */
  shape?: number;

  /**
   * Edge blur/softness
   * @default 1.0
   */
  blur?: number;

  /**
   * Color of the aura in hexidecimal format.
   * @default '#1FD5F9'
   */
  color?: `#${string}`;

  /**
   * Color variation across layers (0-1)
   * Controls how much colors change between iterations
   * @default 0.5
   * @example 0.0 - minimal color variation (more uniform)
   * @example 0.5 - moderate variation (default)
   * @example 1.0 - maximum variation (rainbow effect)
   */
  colorShift?: number;

  /**
   * Brightness of the aurora (0-1)
   * @default 1.0
   */
  brightness?: number;

  /**
   * Display mode for different backgrounds
   * - 'dark': Optimized for dark backgrounds (default)
   * - 'light': Optimized for light/white backgrounds (inverts colors)
   * @default 'dark'
   */
  themeMode?: 'dark' | 'light';
}

function AuraShader({
  shape = 1.0,
  speed = 1.0,
  amplitude = 0.5,
  frequency = 0.5,
  scale = 0.2,
  blur = 1.0,
  color = DEFAULT_COLOR,
  colorShift = 1.0,
  brightness = 1.0,
  themeMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light',
  ref,
  className,
  ...props
}: AuraShaderProps & ComponentProps<'div'>) {
  const rgbColor = useMemo(() => hexToRgb(color), [color]);

  return (
    <div ref={ref} className={className} {...props}>
      <ReactShaderToy
        fs={shaderSource}
        devicePixelRatio={globalThis.devicePixelRatio ?? 1}
        uniforms={{
          // Aurora wave speed
          uSpeed: { type: '1f', value: speed },
          // Edge blur/softness
          uBlur: { type: '1f', value: blur },
          // Shape scale
          uScale: { type: '1f', value: scale },
          // Shape type: 1=circle, 2=line
          uShape: { type: '1f', value: shape },
          // Wave frequency and complexity
          uFrequency: { type: '1f', value: frequency },
          // Turbulence amplitude
          uAmplitude: { type: '1f', value: amplitude },
          // Light intensity (bloom)
          uBloom: { type: '1f', value: 0.0 },
          // Brightness of the aurora (0-1)
          uMix: { type: '1f', value: brightness },
          // Color variation across layers (0-1)
          uSpacing: { type: '1f', value: 0.5 },
          // Color palette offset - shifts colors along the gradient (0-1)
          uColorShift: { type: '1f', value: colorShift },
          // Color variation across layers (0-1)
          uVariance: { type: '1f', value: 0.1 },
          // Smoothing of the aurora (0-1)
          uSmoothing: { type: '1f', value: 1.0 },
          // Display mode: 0=dark background, 1=light background
          uMode: { type: '1f', value: themeMode === 'light' ? 1.0 : 0.0 },
          // Color
          uColor: { type: '3fv', value: rgbColor ?? [0, 0.7, 1] },
        }}
        onError={(error) => {
          console.error('Shader error:', error);
        }}
        onWarning={(warning) => {
          console.warn('Shader warning:', warning);
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

AuraShader.displayName = 'AuraShader';

export const AgentAudioVisualizerAuraVariants = cva(['aspect-square'], {
  variants: {
    size: {
      icon: 'h-[24px] gap-[2px]',
      sm: 'h-[56px] gap-[4px]',
      md: 'h-[112px] gap-[8px]',
      lg: 'h-[224px] gap-[16px]',
      xl: 'h-[448px] gap-[32px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface AgentAudioVisualizerAuraProps {
  /**
   * The size of the visualizer.
   * @defaultValue 'lg'
   */
  size?: 'icon' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Agent state
   * @default 'connecting'
   */
  state?: AgentState;
  /**
   * The color of the aura in hexidecimal format.
   * @defaultValue '#1FD5F9'
   */
  color?: `#${string}`;
  /**
   * The color shift of the aura.
   * @defaultValue 0.05
   */
  colorShift?: number;
  /**
   * The theme mode of the aura.
   * @defaultValue 'dark'
   */
  themeMode?: 'dark' | 'light';
  /**
   * The audio track to visualize. Can be a local/remote audio track or a track reference.
   */
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  /**
   * Volume value (0-1) to use instead of the value computed from the audioTrack.
   */
  volume?: number;
}

/**
 * An shader-based audio visualizer that responds to agent state and audio levels.
 * Displays an animated elliptical aura that reacts to the current agent state (connecting, thinking, speaking, etc.)
 * and audio volume when speaking.
 *
 * @extends ComponentProps<'div'>
 *
 * @example
 * ```tsx
 * <AgentAudioVisualizerAura
 *   size="md"
 *   state="speaking"
 *   audioTrack={agentAudioTrack}
 * />
 * ```
 */
export function AgentAudioVisualizerAura({
  size = 'lg',
  state = 'connecting',
  color = DEFAULT_COLOR,
  colorShift = 0.05,
  audioTrack,
  volume,
  themeMode,
  className,
  ref,
  ...props
}: AgentAudioVisualizerAuraProps &
  ComponentProps<'div'> &
  VariantProps<typeof AgentAudioVisualizerAuraVariants>) {
  const { speed, scale, amplitude, frequency, brightness } = useAgentAudioVisualizerAura(
    state,
    audioTrack,
    volume
  );

  return (
    <AuraShader
      ref={ref}
      data-lk-state={state}
      blur={0.2}
      color={color}
      colorShift={colorShift}
      speed={speed}
      scale={scale}
      themeMode={themeMode}
      amplitude={amplitude}
      frequency={frequency}
      brightness={brightness}
      className={cn(AgentAudioVisualizerAuraVariants({ size }), className)}
      {...props}
    />
  );
}
