'use client'

import * as THREE from 'three'
import { useRef, useEffect, memo, useState } from 'react'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { useFBO, useGLTF, MeshTransmissionMaterial } from '@react-three/drei'
import { easing } from 'maath'

function SceneBackdrop() {
  return (
    <>
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[24, 24]} />
        <meshBasicMaterial color="#06060c" />
      </mesh>
      {[
        [-2, 1.5, -1],
        [2.5, -1, -0.5],
        [-1, -2, -1.5],
        [1, 2, -2],
        [0, 0, -1],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.25 + (i % 2) * 0.15, 16, 16]} />
          <meshBasicMaterial color={['#6366f1', '#8b5cf6', '#22d3ee', '#a78bfa', '#6366f1'][i]} />
        </mesh>
      ))}
    </>
  )
}

const ModeWrapper = memo(function ModeWrapper({
  followPointer = true,
  scale = 0.12,
}: {
  followPointer?: boolean
  scale?: number
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const { nodes } = useGLTF('/assets/3d/lens.glb')
  const buffer = useFBO()
  const { viewport: vp } = useThree()
  const [scene] = useState<THREE.Scene>(() => new THREE.Scene())
  const geoWidthRef = useRef(1)

  useEffect(() => {
    const geo = (nodes.Cylinder as THREE.Mesh)?.geometry
    geo?.computeBoundingBox()
    if (geo?.boundingBox) {
      geoWidthRef.current = geo.boundingBox.max.x - geo.boundingBox.min.x || 1
    }
  }, [nodes])

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state
    const v = viewport.getCurrentViewport(camera, [0, 0, 15])

    const destX = followPointer ? (pointer.x * v.width) / 2 : 0
    const destY = followPointer ? (pointer.y * v.height) / 2 : 0
    easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta)

    const maxWorld = v.width * 0.9
    const desired = maxWorld / geoWidthRef.current
    ref.current.scale.setScalar(Math.min(scale, desired))

    gl.setRenderTarget(buffer)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.setClearColor(0x000000, 0)
  })

  return (
    <>
      {createPortal(<SceneBackdrop />, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <mesh
        ref={ref}
        scale={scale}
        rotation-x={Math.PI / 2}
        geometry={(nodes.Cylinder as THREE.Mesh)?.geometry}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={1.15}
          thickness={4}
          anisotropy={0.01}
          chromaticAberration={0.08}
        />
      </mesh>
    </>
  )
})

export default function BootFluidLens() {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 15 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ModeWrapper followPointer scale={0.1} />
    </Canvas>
  )
}
