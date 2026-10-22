import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  PropertyUnit,
  Project,
  formatInrCompact,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw,
  Sun,
  Sunset,
} from 'lucide-react';

interface ThreeTowerViewProps {
  project: Project;
  units: PropertyUnit[];
  visibleUnitIds?: Set<string>;
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
}

type CameraPresetKey = 'isometric' | 'front' | 'crown' | 'podium';
type LightingMood = 'daylight' | 'golden';

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();

function createProceduralPavingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#EDEDE7';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#DEDED8';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.fillStyle = '#CBCBCB';
  for (let x = 0; x <= 512; x += step) {
    for (let y = 0; y <= 512; y += step) {
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 120);
  grad.addColorStop(0, 'rgba(15, 14, 71, 0.55)');
  grad.addColorStop(0.6, 'rgba(15, 14, 71, 0.22)');
  grad.addColorStop(1, 'rgba(15, 14, 71, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ThreeTowerView: React.FC<ThreeTowerViewProps> = ({
  project,
  units,
  visibleUnitIds,
  selectedUnitId,
  onSelectUnit,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<CameraPresetKey>('isometric');
  const [lightingMood, setLightingMood] = useState<LightingMood>('daylight');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglFailed, setWebglFailed] = useState<boolean>(false);
  const [hoveredUnit, setHoveredUnit] = useState<{
    unit: PropertyUnit;
    x: number;
    y: number;
  } | null>(null);

  const unitsRef = useRef<PropertyUnit[]>(units);
  unitsRef.current = units;

  const visibleUnitIdsRef = useRef<Set<string> | undefined>(visibleUnitIds);
  visibleUnitIdsRef.current = visibleUnitIds;

  const selectedUnitIdRef = useRef<string | null>(selectedUnitId);
  selectedUnitIdRef.current = selectedUnitId;

  const onSelectUnitRef = useRef(onSelectUnit);
  onSelectUnitRef.current = onSelectUnit;

  const explodeTargetRef = useRef<number>(0);
  const explodeCurrentRef = useRef<number>(0);

  const activeCameraTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    look: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(19, 16, 22),
    look: new THREE.Vector3(0, 6.5, 0),
  });

  const sceneControllerRef = useRef<{
    requestRender: () => void;
    syncUnitMaterials: () => void;
    applyLightingMood: (mood: LightingMood) => void;
  } | null>(null);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    let cleanupFn: (() => void) | undefined;

    try {
      const isSoftwareGl = (() => {
        try {
          const gl =
            document.createElement('canvas').getContext('webgl2') ||
            document.createElement('canvas').getContext('webgl');
          if (!gl) return true;
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
          const gpu = String(gl.getParameter(param) || '');
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        } catch {
          return true;
        }
      })();

      const width = mount.clientWidth || 960;
      const height = mount.clientHeight || 520;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyHex = 0x0b0b1e; // Dark Eclipse sky
    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.FogExp2(skyHex, 0.014);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 160);
    camera.position.set(19, 16, 22);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 6.2, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 9;
    controls.maxDistance = 48;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.update();

    const hemiLight = new THREE.HemisphereLight(0xe2e2f0, 0x121228, 0.85);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffe3, 2.2);
    keyLight.position.set(18, 28, 16);
    keyLight.castShadow = !isSoftwareGl;
    const d = 16;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8686ac, 0.9);
    rimLight.position.set(-18, 16, -16);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const pavingTex = createProceduralPavingTexture(maxAniso);
    const shadowTex = createRadialContactShadowTexture();

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const groundMat = new THREE.MeshStandardMaterial({
      map: pavingTex,
      roughness: 0.82,
      metalness: 0.08,
      color: 0x26264a,
    });
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 64),
      groundMat
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    rootGroup.add(groundMesh);

    const contactShadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      })
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.y = 0.02;
    rootGroup.add(contactShadowPlane);

    const podiumGroup = new THREE.Group();
    const podiumStoneMat = new THREE.MeshStandardMaterial({
      color: 0x171731,
      roughness: 0.65,
      metalness: 0.2,
    });
    const podiumTrimMat = new THREE.MeshStandardMaterial({
      color: 0xa6b4c3,
      roughness: 0.3,
      metalness: 0.75,
    });
    const atriumGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc6c6df,
      roughness: 0.12,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.75,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 0.9,
      ior: 1.5,
    });

    const podiumPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.7, 10.5),
      podiumStoneMat
    );
    podiumPlinth.position.y = 0.35;
    podiumPlinth.castShadow = true;
    podiumPlinth.receiveShadow = true;
    podiumGroup.add(podiumPlinth);

    const lobbyAtrium = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 1.3, 7.8),
      atriumGlassMat
    );
    lobbyAtrium.position.y = 1.35;
    podiumGroup.add(lobbyAtrium);

    const podiumCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(13.2, 0.25, 9.2),
      podiumTrimMat
    );
    podiumCanopy.position.y = 2.1;
    podiumCanopy.castShadow = true;
    podiumGroup.add(podiumCanopy);

    const colGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.4, 16);
    [-4.8, -1.6, 1.6, 4.8].forEach((cx) => {
      [-3.8, 3.8].forEach((cz) => {
        const col = new THREE.Mesh(colGeo, podiumTrimMat);
        col.position.set(cx, 1.35, cz);
        podiumGroup.add(col);
      });
    });

    rootGroup.add(podiumGroup);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.85,
    });
    const canopyMat1 = new THREE.MeshStandardMaterial({
      color: 0x2e7d5b,
      roughness: 0.6,
    });
    const canopyMat2 = new THREE.MeshStandardMaterial({
      color: 0x3b946e,
      roughness: 0.5,
    });

    const treePositions: [number, number][] = [
      [-9.2, 6.2],
      [-6.5, 6.8],
      [6.5, 6.8],
      [9.2, 6.2],
      [-9.2, -6.2],
      [9.2, -6.2],
    ];
    treePositions.forEach(([tx, tz], i) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);
      const scale = 0.9 + (i % 3) * 0.1;
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 1.1, 10),
        trunkMat
      );
      trunk.position.y = 0.55;
      tree.add(trunk);

      const lowerCrown = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.5, 12),
        canopyMat1
      );
      lowerCrown.position.y = 1.55;
      tree.add(lowerCrown);

      const upperCrown = new THREE.Mesh(
        new THREE.ConeGeometry(0.62, 1.2, 12),
        canopyMat2
      );
      upperCrown.position.y = 2.3;
      tree.add(upperCrown);

      rootGroup.add(tree);
    });

    const maxFloor = project.floors;
    const floorHeight = 1.65;
    const baseElevation = 2.25;
    const coreHeight = maxFloor * floorHeight + 1.4;

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x272757,
      roughness: 0.45,
      metalness: 0.35,
    });
    const coreTower = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, coreHeight, 4.2),
      coreMat
    );
    coreTower.position.set(0, baseElevation + coreHeight / 2 - 0.4, 0);
    coreTower.castShadow = true;
    coreTower.receiveShadow = true;
    rootGroup.add(coreTower);

    // Status Materials synced to Blue Eclipse + Ink Wash specification:
    // Available #2E7D5B · On hold #9A6410 · Sold #4A4A4A
    const statusPalette = {
      Available: {
        base: 0x2e7d5b,
        emissive: 0x1d523b,
        glass: 0xa7f3d0,
      },
      Hold: {
        base: 0x9a6410,
        emissive: 0x6b450b,
        glass: 0xfde68a,
      },
      Sold: {
        base: 0x4a4a4a,
        emissive: 0x262626,
        glass: 0xa3a3a0,
      },
    };

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xedede7,
      roughness: 0.55,
      metalness: 0.15,
    });
    const balconyRailingMat = new THREE.MeshStandardMaterial({
      color: 0xcbcbcb,
      roughness: 0.25,
      metalness: 0.7,
    });

    const floorGroups: { floor: number; group: THREE.Group; baseY: number }[] =
      [];
    const clickableMeshes: THREE.Mesh[] = [];
    const unitVisualMap = new Map<
      string,
      {
        bodyMat: THREE.MeshStandardMaterial;
        beaconMat: THREE.MeshStandardMaterial;
        outlineMesh: THREE.Mesh;
        unitGroup: THREE.Group;
      }
    >();

    const stackCoords: Record<
      number,
      { x: number; z: number; balconyDir: number }
    > = {
      1: { x: -3.7, z: 1.85, balconyDir: 1 },
      2: { x: -3.7, z: -1.85, balconyDir: -1 },
      3: { x: 3.7, z: 1.85, balconyDir: 1 },
      4: { x: 3.7, z: -1.85, balconyDir: -1 },
    };

    for (let f = 1; f <= maxFloor; f++) {
      const floorGroup = new THREE.Group();
      const baseY = baseElevation + (f - 1) * floorHeight;
      floorGroup.position.y = baseY;

      const floorSlab = new THREE.Mesh(
        new THREE.BoxGeometry(11.8, 0.16, 7.6),
        slabMat
      );
      floorSlab.position.y = 0.08;
      floorSlab.castShadow = true;
      floorSlab.receiveShadow = true;
      floorGroup.add(floorSlab);

      const floorUnits = unitsRef.current.filter((u) => u.floor === f);
      floorUnits.forEach((unit) => {
        const coord = stackCoords[unit.stackIndex] || stackCoords[1];
        const unitGroup = new THREE.Group();
        unitGroup.position.set(coord.x, 0.16, coord.z);

        const pal = statusPalette[unit.status];

        const bodyMat = new THREE.MeshStandardMaterial({
          color: pal.base,
          roughness: 0.35,
          metalness: 0.2,
          emissive: pal.emissive,
          emissiveIntensity: 0.18,
        });
        const bodyGeo = new THREE.BoxGeometry(3.9, 1.28, 3.0);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.64;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        bodyMesh.userData = { unitId: unit.id };
        clickableMeshes.push(bodyMesh);
        unitGroup.add(bodyMesh);

        const glassFacade = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.92, 0.08),
          new THREE.MeshStandardMaterial({
            color: pal.glass,
            roughness: 0.12,
            metalness: 0.65,
          })
        );
        glassFacade.position.set(0, 0.66, coord.balconyDir * 1.51);
        unitGroup.add(glassFacade);

        const balconySlab = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 0.1, 0.65),
          slabMat
        );
        balconySlab.position.set(0, 0.05, coord.balconyDir * 1.8);
        unitGroup.add(balconySlab);

        const balconyRail = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 0.36, 0.06),
          balconyRailingMat
        );
        balconyRail.position.set(0, 0.28, coord.balconyDir * 2.08);
        unitGroup.add(balconyRail);

        const beaconMat = new THREE.MeshStandardMaterial({
          color: pal.base,
          emissive: pal.base,
          emissiveIntensity: 0.55,
          roughness: 0.2,
        });
        const beaconStrip = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 0.1, 0.12),
          beaconMat
        );
        beaconStrip.position.set(0, 1.22, coord.balconyDir * 1.54);
        unitGroup.add(beaconStrip);

        const outlineMesh = new THREE.Mesh(
          new THREE.BoxGeometry(4.06, 1.38, 3.16),
          new THREE.MeshBasicMaterial({
            color: 0xffffe3,
            wireframe: true,
            transparent: true,
            opacity: 0.95,
          })
        );
        outlineMesh.position.y = 0.65;
        outlineMesh.visible = unit.id === selectedUnitIdRef.current;
        unitGroup.add(outlineMesh);

        unitVisualMap.set(unit.id, {
          bodyMat,
          beaconMat,
          outlineMesh,
          unitGroup,
        });

        floorGroup.add(unitGroup);
      });

      rootGroup.add(floorGroup);
      floorGroups.push({ floor: f, group: floorGroup, baseY });
    }

    const crownGroup = new THREE.Group();
    const crownBaseY = baseElevation + maxFloor * floorHeight;
    crownGroup.position.y = crownBaseY;

    const roofDeck = new THREE.Mesh(
      new THREE.BoxGeometry(12.2, 0.28, 8.0),
      slabMat
    );
    roofDeck.position.y = 0.14;
    crownGroup.add(roofDeck);

    const crownFinMat = new THREE.MeshStandardMaterial({
      color: 0x505081,
      roughness: 0.25,
      metalness: 0.8,
      emissive: 0x272757,
      emissiveIntensity: 0.35,
    });
    [-4.5, -2.2, 0, 2.2, 4.5].forEach((fx) => {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 1.1, 6.8),
        crownFinMat
      );
      fin.position.set(fx, 0.78, 0);
      crownGroup.add(fin);
    });

    const crownBeamFront = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.22, 0.28),
      podiumTrimMat
    );
    crownBeamFront.position.set(0, 1.28, 3.3);
    crownGroup.add(crownBeamFront);

    const crownBeamBack = crownBeamFront.clone();
    crownBeamBack.position.set(0, 1.28, -3.3);
    crownGroup.add(crownBeamBack);

    rootGroup.add(crownGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isDisposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync
        ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
        : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (isDisposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (isDisposed) return;
        renderDirty = false;
        const dt = Math.min(clock.getDelta(), 0.1) || 0.016;
        let needsMoreFrames = false;

        const expDiff = Math.abs(
          explodeTargetRef.current - explodeCurrentRef.current
        );
        if (expDiff > 0.002) {
          explodeCurrentRef.current = THREE.MathUtils.damp(
            explodeCurrentRef.current,
            explodeTargetRef.current,
            8,
            dt
          );
          floorGroups.forEach((fg) => {
            fg.group.position.y =
              fg.baseY + (fg.floor - 1) * explodeCurrentRef.current * 1.45;
          });
          crownGroup.position.y =
            crownBaseY + maxFloor * explodeCurrentRef.current * 1.45;
          needsMoreFrames = true;
        }

        if (activeCameraTransitionRef.current.active) {
          const factor = 1 - Math.exp(-7 * dt);
          camera.position.lerp(activeCameraTransitionRef.current.pos, factor);
          controls.target.lerp(activeCameraTransitionRef.current.look, factor);
          if (
            camera.position.distanceTo(activeCameraTransitionRef.current.pos) <
              0.08 &&
            controls.target.distanceTo(activeCameraTransitionRef.current.look) <
              0.08
          ) {
            activeCameraTransitionRef.current.active = false;
          } else {
            needsMoreFrames = true;
          }
        }

        const controlsChanged = controls.update();
        if (controlsChanged && !isSoftwareGl) {
          needsMoreFrames = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    const onControlStart = () => {
      activeCameraTransitionRef.current.active = false;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    function syncUnitMaterials() {
      const filterSet = visibleUnitIdsRef.current;
      unitsRef.current.forEach((u) => {
        const vis = unitVisualMap.get(u.id);
        if (!vis) return;
        const pal = statusPalette[u.status];
        const isSelected = u.id === selectedUnitIdRef.current;
        const isVisibleByFilter = !filterSet || filterSet.has(u.id);

        vis.unitGroup.visible = isVisibleByFilter;
        vis.bodyMat.color.setHex(pal.base);
        vis.bodyMat.emissive.setHex(isSelected ? 0x505081 : pal.emissive);
        vis.bodyMat.emissiveIntensity = isSelected ? 0.5 : 0.18;
        vis.beaconMat.color.setHex(pal.base);
        vis.beaconMat.emissive.setHex(pal.base);
        vis.outlineMesh.visible = isSelected && isVisibleByFilter;
      });
      requestRender();
    }

    function applyLightingMood(mood: LightingMood) {
      if (mood === 'golden') {
        const sunsetHex = 0x0f0e47;
        scene.background = new THREE.Color(sunsetHex);
        scene.fog = new THREE.FogExp2(sunsetHex, 0.014);
        keyLight.color.setHex(0xfdba74);
        keyLight.intensity = 2.5;
        keyLight.position.set(24, 14, 18);
        hemiLight.color.setHex(0xffffe3);
        hemiLight.groundColor.setHex(0x0f0e47);
      } else {
        const dayHex = 0x0b0b1e;
        scene.background = new THREE.Color(dayHex);
        scene.fog = new THREE.FogExp2(dayHex, 0.014);
        keyLight.color.setHex(0xffffe3);
        keyLight.intensity = 2.2;
        keyLight.position.set(18, 28, 16);
        hemiLight.color.setHex(0xe2e2f0);
        hemiLight.groundColor.setHex(0x121228);
      }
      requestRender();
    }

    sceneControllerRef.current = {
      requestRender,
      syncUnitMaterials,
      applyLightingMood,
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster
        .intersectObjects(clickableMeshes, false)
        .filter((h) => h.object.parent?.visible !== false);
      if (hits.length > 0) {
        const hitUnitId = hits[0].object.userData?.unitId;
        if (hitUnitId) {
          onSelectUnitRef.current(hitUnitId);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster
        .intersectObjects(clickableMeshes, false)
        .filter((h) => h.object.parent?.visible !== false);
      if (hits.length > 0) {
        const hitUnitId = hits[0].object.userData?.unitId;
        const found = unitsRef.current.find((u) => u.id === hitUnitId);
        if (found) {
          renderer.domElement.style.cursor = 'pointer';
          setHoveredUnit({
            unit: found,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          return;
        }
      }
      renderer.domElement.style.cursor = 'grab';
      setHoveredUnit(null);
    };

    const handlePointerLeave = () => {
      setHoveredUnit(null);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerleave', handlePointerLeave);

    const handleResize = () => {
      if (!mount || isDisposed) return;
      const w = mount.clientWidth || 960;
      const h = mount.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    requestRender();

      cleanupFn = () => {
        isDisposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        window.removeEventListener('resize', handleResize);
        domElem.removeEventListener('pointerdown', handlePointerDown);
        domElem.removeEventListener('pointerup', handlePointerUp);
        domElem.removeEventListener('pointermove', handlePointerMove);
        domElem.removeEventListener('pointerleave', handlePointerLeave);
        controls.dispose();
        pavingTex.dispose();
        shadowTex.dispose();
        envTarget.dispose();
        renderer.dispose();
      };
    } catch (err) {
      console.warn('WebGL initialization fallback:', err);
      setWebglFailed(true);
    }

    return () => {
      cleanupFn?.();
    };
  }, [project.id, project.floors]);

  useEffect(() => {
    sceneControllerRef.current?.syncUnitMaterials();
  }, [units, visibleUnitIds, selectedUnitId]);

  const handleExplodeChange = (val: number) => {
    setExplodeFactor(val);
    explodeTargetRef.current = val;
    sceneControllerRef.current?.requestRender();
  };

  const handleCameraPreset = (preset: CameraPresetKey) => {
    setActivePreset(preset);
    if (preset === 'isometric') {
      _camTargetPos.set(19, 16, 22);
      _camTargetLook.set(0, 6.2, 0);
    } else if (preset === 'front') {
      _camTargetPos.set(0, 8.5, 24);
      _camTargetLook.set(0, 6.5, 0);
    } else if (preset === 'crown') {
      _camTargetPos.set(11, 18, 12);
      _camTargetLook.set(0, 10.5, 0);
    } else {
      _camTargetPos.set(12, 4.2, 14);
      _camTargetLook.set(0, 2.2, 0);
    }
    activeCameraTransitionRef.current = {
      active: true,
      pos: _camTargetPos.clone(),
      look: _camTargetLook.clone(),
    };
    sceneControllerRef.current?.requestRender();
  };

  const handleLightingToggle = (mood: LightingMood) => {
    setLightingMood(mood);
    sceneControllerRef.current?.applyLightingMood(mood);
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[520px] rounded-[10px] overflow-hidden border border-[var(--border)] bg-[#0B0B1E] select-none">
      <div ref={canvasMountRef} className="w-full h-full" />

      {webglFailed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-[#0B0B1E]">
          <Layers className="w-10 h-10 text-[#8686AC] mb-2" />
          <div className="text-sm font-semibold text-[#FFFFE3]">
            Interactive Stacking Matrix
          </div>
          <p className="text-xs text-[#A9A9C6] max-w-sm mt-1">
            3D WebGL accelerated hardware fallback active. Use the Stacking Matrix below for full unit selection and locking.
          </p>
        </div>
      )}

      {hoveredUnit && (
        <div
          className="hidden sm:block absolute z-20 pointer-events-none px-3 py-2 rounded-[6px] border border-[#26264A] t-12 text-[#EEEEF4] shadow-eclipse"
          style={{
            left: Math.min(hoveredUnit.x + 14, 720),
            top: Math.max(hoveredUnit.y - 56, 12),
            backgroundColor: '#0F0E47',
          }}
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="font-mono tabular-nums">
              Unit {hoveredUnit.unit.unitNumber}
            </span>
            <span>·</span>
            <span>{hoveredUnit.unit.bhk}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    hoveredUnit.unit.status === 'Available'
                      ? '#2E7D5B'
                      : hoveredUnit.unit.status === 'Hold'
                      ? '#9A6410'
                      : '#8686AC',
                }}
              />
              <span>
                {hoveredUnit.unit.status === 'Hold'
                  ? 'On hold'
                  : hoveredUnit.unit.status}
              </span>
            </span>
          </div>
          <div className="text-[#A9A9C6] font-mono tabular-nums mt-0.5">
            {hoveredUnit.unit.carpetAreaSqFt.toLocaleString('en-IN')} sq ft ·{' '}
            {formatInrCompact(getUnitAllInclusivePrice(hoveredUnit.unit))}
          </div>
        </div>
      )}

      <div
        className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[95vw]"
        style={{ width: 'min(780px, 95vw)' }}
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-t-[6px] border border-b-0 border-[#26264A] t-12 text-[#A9A9C6] hover:text-[#FFFFE3] transition-colors cursor-pointer"
          style={{ backgroundColor: '#0F0E47' }}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            className="w-full px-2.5 sm:px-3 py-2 rounded-[10px] border border-[#26264A] flex flex-wrap items-center justify-between gap-2 sm:gap-3 t-12 text-[#E4E4F2] shadow-eclipse"
            style={{ backgroundColor: '#0F0E47' }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Layers className="w-3.5 h-3.5 text-[#8686AC] shrink-0" />
              <label
                htmlFor="floor-explode-slider"
                className="whitespace-nowrap text-[#A9A9C6] text-[11px] sm:text-[12px]"
              >
                Floors
              </label>
              <input
                id="floor-explode-slider"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodeFactor}
                onChange={(e) =>
                  handleExplodeChange(parseFloat(e.target.value))
                }
                className="w-16 sm:w-20 accent-[#FFFFE3] cursor-pointer"
              />
              {explodeFactor > 0 && (
                <button
                  type="button"
                  onClick={() => handleExplodeChange(0)}
                  className="text-[#A9A9C6] hover:text-[#FFFFE3] cursor-pointer"
                  aria-label="Reset floor separation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <Camera className="w-3.5 h-3.5 text-[#8686AC] mr-1 shrink-0 hidden sm:inline" />
              {(
                [
                  { id: 'isometric', label: 'Aerial' },
                  { id: 'front', label: 'Facade' },
                  { id: 'crown', label: 'Crown' },
                  { id: 'podium', label: 'Podium' },
                ] as { id: CameraPresetKey; label: string }[]
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleCameraPreset(preset.id)}
                  className={`px-2 py-1 rounded-[6px] text-[11px] sm:text-[12px] transition-colors cursor-pointer shrink-0 ${
                    activePreset === preset.id
                      ? 'bg-[#FFFFE3] text-[#0F0E47] font-medium'
                      : 'text-[#A9A9C6] hover:bg-[#1B1A4E] hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-[#08072E] p-0.5 rounded-[6px] border border-[#26264A]">
              <button
                type="button"
                onClick={() => handleLightingToggle('daylight')}
                className={`flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] sm:text-[12px] transition-colors cursor-pointer ${
                  lightingMood === 'daylight'
                    ? 'bg-[#272757] text-[#FFFFE3]'
                    : 'text-[#8686AC] hover:text-white'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Day</span>
              </button>
              <button
                type="button"
                onClick={() => handleLightingToggle('golden')}
                className={`flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] sm:text-[12px] transition-colors cursor-pointer ${
                  lightingMood === 'golden'
                    ? 'bg-[#272757] text-[#FFFFE3]'
                    : 'text-[#8686AC] hover:text-white'
                }`}
              >
                <Sunset className="w-3 h-3" />
                <span>Dusk</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreeTowerView;
