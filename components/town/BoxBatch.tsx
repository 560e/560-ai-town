import { useLayoutEffect, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";

export interface BoxSpec {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}

/** One draw call for many architectural pieces, with shared geometry and material. */
export default function BoxBatch({ boxes, castShadow = true }: { boxes: BoxSpec[]; castShadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new Object3D(), color = new Color();
    boxes.forEach((box, index) => {
      object.position.set(...box.position);
      object.scale.set(...box.size);
      object.rotation.set(...(box.rotation ?? [0, 0, 0] as [number, number, number]));
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      mesh.setColorAt(index, color.set(box.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);
  return <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} castShadow={castShadow} receiveShadow>
    <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={.78} />
  </instancedMesh>;
}
