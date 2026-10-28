import { useMemo } from "react";
import { Shape } from "three";
import type { Point } from "@/types/town";

export function Block({ position, size, color, ...props }: { position: [number, number, number]; size: [number, number, number]; color: string; castShadow?: boolean }) {
  return <mesh position={position} receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}

export function Slab({ outline, y, depth, color, scale = 1 }: { outline: Point[]; y: number; depth: number; color: string; scale?: number }) {
  const shape = useMemo(() => {
    const result = new Shape();
    outline.forEach(([x, z], index) => index ? result.lineTo(x * scale, -z * scale) : result.moveTo(x * scale, -z * scale));
    result.closePath();
    return result;
  }, [outline, scale]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow castShadow>
    <extrudeGeometry args={[shape, { depth, bevelEnabled: true, bevelSize: 0.32, bevelThickness: 0.15, bevelSegments: 1 }]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>;
}

export function Disk({ position, radius, color, height = 0.12, inner }: { position: [number, number, number]; radius: number; color: string; height?: number; inner?: number }) {
  return <mesh position={position} rotation={inner ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} receiveShadow>
    {inner ? <ringGeometry args={[inner, radius, 64]} /> : <cylinderGeometry args={[radius, radius, height, 48]} />}
    <meshStandardMaterial color={color} roughness={0.85} />
  </mesh>;
}
