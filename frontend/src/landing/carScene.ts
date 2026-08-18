import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * The 3D car stage: a real glTF model, orbited and taken apart by scroll.
 *
 * Deliberately plain TypeScript with no React in it. Three.js owns a mutable
 * scene graph and its own animation loop, which fights React's render model;
 * keeping it behind init/setProgress/dispose means React only ever hands it a
 * number and a DOM node.
 *
 * Model: Ferrari 458 Italia by vicent091036 (Sketchfab), the same asset the
 * official three.js car demo ships. Credited in the page footer as its licence
 * requires.
 */

export interface CarStage {
  /** 0 = assembled, 1 = fully apart. Drives both the orbit and the teardown. */
  setProgress(p: number): void
  resize(): void
  dispose(): void
}

/** Where each assembly travels to, in model units. */
const EXPLODE = {
  glass: new THREE.Vector3(0, 1.55, 0),
  body: new THREE.Vector3(0, 0.72, 0),
  interior: new THREE.Vector3(0, -0.15, -1.5),
  wheel_fl: new THREE.Vector3(-1.25, -0.15, -0.95),
  wheel_fr: new THREE.Vector3(1.25, -0.15, -0.95),
  wheel_rl: new THREE.Vector3(-1.25, -0.15, 0.95),
  wheel_rr: new THREE.Vector3(1.25, -0.15, 0.95),
} as const

const INTERIOR_NODES = [
  'leather', 'carpet', 'interior_dark', 'interior_light',
  'steering_wheel', 'steering_carbon', 'steering_centre', 'steering_column',
  'steering_leather', 'steering_metal', 'steering_red_lights', 'steering_trim',
]

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)

export async function createCarStage(
  container: HTMLElement,
  opts: { reducedMotion?: boolean; onLoaded?: () => void; onError?: (e: unknown) => void } = {},
): Promise<CarStage> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  // Capping DPR at 2 matters on phones: a 3x display would render nine times
  // the pixels for a difference nobody can see, and drop the frame rate doing it.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.92
  renderer.shadowMap.enabled = false
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(
    38, container.clientWidth / container.clientHeight, 0.1, 100,
  )

  // A procedural room as the environment map. This is what makes the paint and
  // chrome read as real: PBR metal is almost entirely reflection, so without an
  // environment a metallic surface renders as a flat black shape.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture

  // A soft key light on top of the environment, so the body has a direction to
  // its highlights rather than being lit evenly from everywhere.
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(4, 6, 3)
  scene.add(key)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25))

  const carRoot = new THREE.Group()
  scene.add(carRoot)

  // Baked contact shadow. A car floating with no shadow reads as a cut-out
  // immediately; this one texture does more for believability than any light.
  const shadowTex = await new THREE.TextureLoader().loadAsync('/models/ferrari_ao.png')
  shadowTex.colorSpace = THREE.SRGBColorSpace
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
    new THREE.MeshBasicMaterial({
      map: shadowTex, blending: THREE.MultiplyBlending, opacity: 0.9,
      transparent: true, depthWrite: false,
    }),
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.renderOrder = 2
  scene.add(shadowPlane)

  const draco = new DRACOLoader()
  draco.setDecoderPath('/models/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const groups: { node: THREE.Object3D; home: THREE.Vector3; to: THREE.Vector3 }[] = []
  const wheels: THREE.Object3D[] = []

  try {
    const gltf = await loader.loadAsync('/models/ferrari.glb')
    const car = gltf.scene
    car.rotation.y = Math.PI
    carRoot.add(car)

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x11161d,
      metalness: 0.92,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
    })

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0d11,
      metalness: 0.25,
      roughness: 0.06,
      transmission: 0.92,
      transparent: true,
      opacity: 0.42,
      thickness: 0.04,
    })

    car.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => {
        const name = (m as THREE.Material).name
        if (name === 'Body_Color') mesh.material = bodyMat
        else if (name === 'Glass_Gray' || name === 'Projector_Glass') mesh.material = glassMat
        else if (name === 'Tires' || name === 'Carpet') {
          const mm = m as THREE.MeshStandardMaterial
          mm.roughness = 0.95; mm.metalness = 0
        } else if (name === 'metal_chrome') {
          const mm = m as THREE.MeshStandardMaterial
          mm.metalness = 1; mm.roughness = 0.06
        }
      })
    })

    // Collect the assemblies that move. Everything not claimed here stays put,
    // which is what keeps the chassis reading as the thing being stripped.
    const claim = (name: string, to: THREE.Vector3) => {
      const node = car.getObjectByName(name)
      if (!node) return
      groups.push({ node, home: node.position.clone(), to })
    }

    claim('glass', EXPLODE.glass)
    claim('body', EXPLODE.body)
    for (const n of INTERIOR_NODES) claim(n, EXPLODE.interior)
    ;(['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'] as const).forEach((w) => {
      claim(w, EXPLODE[w])
      const node = car.getObjectByName(w)
      if (node) wheels.push(node)
    })

    opts.onLoaded?.()
  } catch (err) {
    opts.onError?.(err)
    throw err
  }

  const target = new THREE.Vector3(0, 0.42, 0)
  let raf = 0
  let progress = 0
  let rendered = -1

  function layout(p: number) {
    // A full turn plus a little, so the car is never square-on to the camera at
    // the start or the end - a three-quarter view reads as more dimensional.
    const azimuth = -0.6 + p * Math.PI * 2.15
    // Pull back and lift as it comes apart, so the spread assemblies stay framed.
    const radius = 5.6 + easeInOut(clamp((p - 0.4) / 0.6)) * 3.4
    const height = 1.15 + easeInOut(clamp((p - 0.3) / 0.7)) * 2.15

    camera.position.set(
      Math.sin(azimuth) * radius,
      height,
      Math.cos(azimuth) * radius,
    )
    camera.lookAt(target)

    const e = easeInOut(clamp((p - 0.42) / 0.5))
    for (const g of groups) {
      g.node.position.set(
        g.home.x + g.to.x * e,
        g.home.y + g.to.y * e,
        g.home.z + g.to.z * e,
      )
    }

    // Wheels turn while the car is still together, then stop as they detach -
    // a wheel spinning in mid-air after removal would look like a bug.
    const spin = p * 26 * (1 - e)
    for (const w of wheels) w.rotation.x = spin

    shadowPlane.material.opacity = 0.9 * (1 - e * 0.85)
  }

  function render() {
    renderer.render(scene, camera)
  }

  function loop() {
    raf = requestAnimationFrame(loop)
    if (progress === rendered) return   // idle when the page is not scrolling
    rendered = progress
    layout(progress)
    render()
  }

  layout(0)
  render()
  if (!opts.reducedMotion) loop()

  return {
    setProgress(p: number) {
      progress = clamp(p)
      if (opts.reducedMotion) { layout(progress); render() }
    },
    resize() {
      const w = container.clientWidth
      const h = container.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      rendered = -1
    },
    dispose() {
      cancelAnimationFrame(raf)
      draco.dispose()
      envRT.dispose()
      pmrem.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.geometry?.dispose()
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach((x) => x?.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
