"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function GlowParticles({ count = 900 }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = 3.2 + Math.random() * 5.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i3 + 1] = (Math.random() - 0.5) * 4.5;
      arr[i3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.5 - 1.5;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.03;
    ref.current.rotation.x = Math.sin(t * 0.08) * 0.05;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#ff5a4a" size={0.018} sizeAttenuation depthWrite={false} opacity={0.7} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

function AccentParticles({ count = 350 }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3] = (Math.random() - 0.5) * 10;
      arr[i3 + 1] = (Math.random() - 0.5) * 5;
      arr[i3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = -t * 0.02;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#ff8a3d" size={0.012} sizeAttenuation depthWrite={false} opacity={0.45} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

function CoreRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.PI / 2.2 + Math.sin(t * 0.25) * 0.08;
    ref.current.rotation.z = t * 0.12;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
      <mesh ref={ref} position={[2.2, 0.1, -1.2]}>
        <torusGeometry args={[1.35, 0.012, 16, 220]} />
        <meshBasicMaterial color="#ff4d5a" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[2.2, 0.1, -1.2]} rotation={[Math.PI / 2.2, 0.4, 0]}>
        <torusGeometry args={[1.05, 0.008, 16, 180]} />
        <meshBasicMaterial color="#ff7a3d" transparent opacity={0.35} blending={THREE.AdditiveBlending} />
      </mesh>
    </Float>
  );
}

function GridPlane() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * 0.6) * 0.015;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -1.8, -2.5]}>
      <planeGeometry args={[18, 10, 36, 20]} />
      <meshBasicMaterial color="#ff4d5a" wireframe transparent opacity={0.07} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

export default function HeroScene3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none hidden lg:block">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5.2], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 6, 14]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[3, 2, 3]} intensity={1.2} color="#ff4d5a" />
        <pointLight position={[-3, -1, 2]} intensity={0.7} color="#ff7a3d" />
        <GlowParticles />
        <AccentParticles />
        <CoreRing />
        <GridPlane />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(229,57,69,0.10),transparent_30%),radial-gradient(circle_at_75%_60%,rgba(255,106,42,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#040406]/70" />
    </div>
  );
}
