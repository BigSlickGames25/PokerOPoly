import { useMemo } from "react";
import {
  Box3,
  Group,
  type Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D
} from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import boardMtlSource from "../../assets/models/board.mtl";
import boardObjSource from "../../assets/models/board.obj";
import { theme } from "../theme";

const BOARD_TARGET_SIZE = 10.8;

interface NormalizedBoardModel {
  object: Group;
  offset: [number, number, number];
  scale: number;
}

function applyBoardMaterial(object: Object3D) {
  const boardMaterial = new MeshStandardMaterial({
    color: "#0b1728",
    emissive: theme.colors.accent,
    emissiveIntensity: 0.03,
    metalness: 0.18,
    roughness: 0.76
  });

  object.traverse((child) => {
    if (!("isMesh" in child) || !child.isMesh) {
      return;
    }

    const mesh = child as Mesh;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = boardMaterial;
  });
}

function buildBoardModel() {
  try {
    const materialCreator = new MTLLoader().parse(boardMtlSource, "");
    materialCreator.preload();

    const object = new OBJLoader()
      .setMaterials(materialCreator)
      .parse(boardObjSource);
    const bounds = new Box3().setFromObject(object);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = BOARD_TARGET_SIZE / Math.max(size.x, size.y, 1);

    applyBoardMaterial(object);

    return {
      object,
      offset: [-center.x, -center.y, -bounds.max.z],
      scale
    } satisfies NormalizedBoardModel;
  } catch (error) {
    console.warn("Unable to parse board.obj, falling back to procedural board.", error);
    return null;
  }
}

function ProceduralBoardSurface() {
  return (
    <>
      <mesh castShadow receiveShadow position={[0, 0, -0.22]}>
        <boxGeometry args={[BOARD_TARGET_SIZE, BOARD_TARGET_SIZE, 0.44]} />
        <meshStandardMaterial color="#0b1728" metalness={0.12} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.02]} receiveShadow>
        <boxGeometry args={[9.7, 9.7, 0.04]} />
        <meshStandardMaterial color="#13243b" metalness={0.18} roughness={0.66} />
      </mesh>
    </>
  );
}

export function BoardSurface() {
  const boardModel = useMemo(() => buildBoardModel(), []);

  if (!boardModel) {
    return <ProceduralBoardSurface />;
  }

  return (
    <group scale={[boardModel.scale, boardModel.scale, boardModel.scale]}>
      <primitive
        dispose={null}
        object={boardModel.object}
        position={boardModel.offset}
      />
    </group>
  );
}
