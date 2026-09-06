import 'aframe';
import { CORNER_DETAILS, DEFAULT_DIMENSIONS } from '../model.js';

const { AFRAME } = window;
const { THREE } = AFRAME;
const BASE_HEIGHT = 0.724;
const BASE_FLOOR = 0.098;

function makePath(dimensions) {
  const points = [];
  const lateral = dimensions.lateral / 100;
  const retorno = dimensions.retorno / 100;
  const radius = dimensions.raio / 100;
  const lineStart = -lateral / 2;
  const lineEnd = lateral / 2 - radius;
  const lineSegments = Math.max(12, Math.ceil((lateral - radius) / 0.04));
  const curveSegments = Math.max(18, Math.ceil((radius * Math.PI) / 0.012));
  const returnSegments = Math.max(8, Math.ceil((retorno - radius) / 0.04));

  for (let index = 0; index <= lineSegments; index += 1) {
    const progress = index / lineSegments;
    points.push(new THREE.Vector2(THREE.MathUtils.lerp(lineStart, lineEnd, progress), 0));
  }
  for (let index = 1; index <= curveSegments; index += 1) {
    const angle = THREE.MathUtils.lerp(Math.PI / 2, 0, index / curveSegments);
    points.push(
      new THREE.Vector2(
        lineEnd + radius * Math.cos(angle),
        -radius + radius * Math.sin(angle)
      )
    );
  }
  for (let index = 1; index <= returnSegments; index += 1) {
    points.push(
      new THREE.Vector2(
        lineEnd + radius,
        THREE.MathUtils.lerp(-radius, -retorno, index / returnSegments)
      )
    );
  }
  return points;
}

function scaledY(baseValue, heightMetres) {
  return ((baseValue - BASE_FLOOR) / BASE_HEIGHT) * heightMetres;
}

function pathFrames(points) {
  const frames = [];
  let distance = 0;
  for (let index = 0; index < points.length; index += 1) {
    if (index) distance += points[index].distanceTo(points[index - 1]);
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = next.clone().sub(previous).normalize();
    frames.push({
      point: points[index],
      tangent,
      normal: new THREE.Vector2(-tangent.y, tangent.x),
      distance
    });
  }
  return frames;
}

function makeCanvasTexture(kind, bump = false) {
  const size = kind === 'weave' ? 1024 : 768;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  let seed = 71423;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  if (kind === 'weave') {
    context.fillStyle = bump ? '#626262' : '#c8ae80';
    context.fillRect(0, 0, size, size);
    const cell = 42;
    for (let y = -cell; y < size + cell; y += cell) {
      for (let x = -cell; x < size + cell; x += cell) {
        const shift = Math.floor(y / cell) & 1 ? cell / 2 : 0;
        context.save();
        context.translate(x + shift, y);
        context.rotate(Math.PI / 4);
        context.lineCap = 'round';
        context.strokeStyle = bump ? '#dedede' : '#ead8b4';
        context.lineWidth = 13;
        context.beginPath();
        context.moveTo(-21, 0);
        context.lineTo(21, 0);
        context.stroke();
        context.strokeStyle = bump ? '#9a9a9a' : '#987a51';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-20, 4);
        context.lineTo(20, 4);
        context.stroke();
        context.restore();
      }
    }
    context.globalAlpha = bump ? 0.09 : 0.17;
    for (let index = 0; index < 7000; index += 1) {
      const color = bump ? 80 + random() * 130 : 95 + random() * 105;
      context.fillStyle = `rgb(${color + (bump ? 0 : 25)},${color + (bump ? 0 : 10)},${color - (bump ? 0 : 12)})`;
      context.fillRect(random() * size, random() * size, 0.5 + random() * 3, 0.5 + random());
    }
  } else {
    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const wave =
          Math.sin(x * 0.035 + Math.sin(y * 0.012) * 2.7 + Math.sin(x * 0.006) * 4);
        const pore = random() > 0.992 ? -45 : 0;
        const noise = (random() - 0.5) * 12;
        const base = bump ? 128 + wave * 25 + pore : 86 + wave * 18 + noise;
        const offset = (y * size + x) * 4;
        image.data[offset] = bump ? base : base + 32;
        image.data[offset + 1] = bump ? base : base + 5;
        image.data[offset + 2] = bump ? base : base - 13;
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    if (!bump) {
      const sheen = context.createLinearGradient(0, 0, 0, size);
      sheen.addColorStop(0, 'rgba(255,205,150,.16)');
      sheen.addColorStop(0.5, 'rgba(80,35,15,.02)');
      sheen.addColorStop(1, 'rgba(30,12,4,.20)');
      context.fillStyle = sheen;
      context.fillRect(0, 0, size, size);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = bump ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeSweepGeometry(frames, y0, y1, outerWidth, innerWidth, rows = 1, bulge = 0) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  const rowCount = rows + 1;

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    for (let row = 0; row < rowCount; row += 1) {
      const progress = row / rows;
      const offset = outerWidth + Math.sin(progress * Math.PI) * bulge;
      vertices.push(
        frame.point.x + frame.normal.x * offset,
        THREE.MathUtils.lerp(y0, y1, progress),
        frame.point.y + frame.normal.y * offset
      );
      uvs.push(frame.distance / 0.35, (progress * (y1 - y0)) / 0.35);
    }
  }
  for (let index = 0; index < frames.length - 1; index += 1) {
    for (let row = 0; row < rows; row += 1) {
      const a = index * rowCount + row;
      const b = (index + 1) * rowCount + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const innerOffset = vertices.length / 3;
  for (const frame of frames) {
    vertices.push(
      frame.point.x - frame.normal.x * innerWidth,
      y0,
      frame.point.y - frame.normal.y * innerWidth,
      frame.point.x - frame.normal.x * innerWidth,
      y1,
      frame.point.y - frame.normal.y * innerWidth
    );
    uvs.push(frame.distance / 0.35, 0, frame.distance / 0.35, (y1 - y0) / 0.35);
  }
  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = innerOffset + index * 2;
    const b = a + 2;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }

  const capsOffset = vertices.length / 3;
  for (const frame of frames) {
    for (const y of [y0, y1]) {
      vertices.push(
        frame.point.x + frame.normal.x * outerWidth,
        y,
        frame.point.y + frame.normal.y * outerWidth,
        frame.point.x - frame.normal.x * innerWidth,
        y,
        frame.point.y - frame.normal.y * innerWidth
      );
      uvs.push(frame.distance / 0.1, 0, frame.distance / 0.1, 1);
    }
  }
  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = capsOffset + index * 4;
    const b = a + 4;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
    indices.push(a + 2, b + 2, a + 3, b + 2, b + 3, a + 3);
  }

  const endsOffset = vertices.length / 3;
  for (const index of [0, frames.length - 1]) {
    const frame = frames[index];
    vertices.push(
      frame.point.x + frame.normal.x * outerWidth,
      y0,
      frame.point.y + frame.normal.y * outerWidth,
      frame.point.x - frame.normal.x * innerWidth,
      y0,
      frame.point.y - frame.normal.y * innerWidth,
      frame.point.x + frame.normal.x * outerWidth,
      y1,
      frame.point.y + frame.normal.y * outerWidth,
      frame.point.x - frame.normal.x * innerWidth,
      y1,
      frame.point.y - frame.normal.y * innerWidth
    );
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
  }
  indices.push(
    endsOffset,
    endsOffset + 2,
    endsOffset + 1,
    endsOffset + 1,
    endsOffset + 2,
    endsOffset + 3,
    endsOffset + 4,
    endsOffset + 5,
    endsOffset + 6,
    endsOffset + 5,
    endsOffset + 7,
    endsOffset + 6
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function frameAtDistance(frames, distance) {
  const clamped = THREE.MathUtils.clamp(distance, 0, frames.at(-1).distance);
  let high = 1;
  while (high < frames.length && frames[high].distance < clamped) high += 1;
  const low = Math.max(0, high - 1);
  high = Math.min(frames.length - 1, high);
  const span = frames[high].distance - frames[low].distance || 1;
  const progress = (clamped - frames[low].distance) / span;
  return {
    point: frames[low].point.clone().lerp(frames[high].point, progress),
    normal: frames[low].normal.clone().lerp(frames[high].normal, progress).normalize()
  };
}

function addWovenRelief(group, frames, dimensions, detailScale, inside = false) {
  const height = dimensions.altura / 100;
  const y0 = scaledY(0.232, height);
  const y1 = scaledY(0.713, height);
  const length = frames.at(-1).distance;
  const spacing = 0.021;
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xd5bf98, roughness: 0.91 }),
    new THREE.MeshStandardMaterial({ color: 0xbda176, roughness: 0.94 })
  ];

  for (const [family, slope] of [
    [0, 0.78],
    [1, -0.78]
  ]) {
    const min = y0 - Math.max(0, slope * length);
    const max = y1 - Math.min(0, slope * length);
    for (let intercept = min; intercept <= max; intercept += spacing) {
      const points = [];
      for (let index = 0; index <= 42; index += 1) {
        const distance = (length * index) / 42;
        const y = intercept + slope * distance;
        if (y < y0 || y > y1) continue;
        const frame = frameAtDistance(frames, distance);
        const crossing = Math.sin(
          (distance / spacing + (y - y0) / spacing) * Math.PI
        );
        const offset = inside
          ? (-0.029 - crossing * 0.0007 * (family ? -1 : 1)) * detailScale
          : (0.041 + crossing * 0.0009 * (family ? -1 : 1)) * detailScale;
        points.push(
          new THREE.Vector3(
            frame.point.x + frame.normal.x * offset,
            y,
            frame.point.y + frame.normal.y * offset
          )
        );
      }
      if (points.length < 3) continue;
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const geometry = new THREE.TubeGeometry(
        curve,
        Math.max(8, points.length * 2),
        0.0017 * detailScale,
        5,
        false
      );
      const strand = new THREE.Mesh(geometry, materials[family]);
      strand.name = family ? 'fibra-diagonal-b' : 'fibra-diagonal-a';
      strand.castShadow = strand.receiveShadow = true;
      group.add(strand);
    }
  }
}

function registerCurvedScratcher() {
  if (AFRAME.components['curved-scratcher']) return;
  AFRAME.registerComponent('curved-scratcher', {
    schema: {
      lateral: { default: DEFAULT_DIMENSIONS.lateral },
      retorno: { default: DEFAULT_DIMENSIONS.retorno },
      altura: { default: DEFAULT_DIMENSIONS.altura },
      raio: { default: DEFAULT_DIMENSIONS.raio }
    },
    init() {
      this.group = null;
    },
    update() {
      this.rebuild();
    },
    remove() {
      this.disposeGroup();
    },
    disposeGroup() {
      if (!this.group) return;
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      this.group.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        objectMaterials.filter(Boolean).forEach((material) => {
          materials.add(material);
          for (const key of ['map', 'bumpMap', 'normalMap', 'roughnessMap']) {
            if (material[key]) textures.add(material[key]);
          }
        });
      });
      this.el.removeObject3D('mesh');
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      this.group = null;
    },
    rebuild() {
      this.disposeGroup();
      const dimensions = this.data;
      const height = dimensions.altura / 100;
      const detailScale = THREE.MathUtils.clamp(
        dimensions.raio / DEFAULT_DIMENSIONS.raio,
        0.72,
        1.65
      );
      const renderer = this.el.sceneEl.renderer;
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const configureTexture = (texture) => {
        texture.anisotropy = Math.min(16, maxAnisotropy);
        return texture;
      };
      const weave = configureTexture(makeCanvasTexture('weave'));
      const weaveBump = configureTexture(makeCanvasTexture('weave', true));
      const wood = configureTexture(makeCanvasTexture('wood'));
      const woodBump = configureTexture(makeCanvasTexture('wood', true));
      wood.repeat.set(2.2, 1.2);
      woodBump.repeat.copy(wood.repeat);

      const weaveMaterial = new THREE.MeshStandardMaterial({
        map: weave,
        bumpMap: weaveBump,
        bumpScale: 0.006 * detailScale,
        color: 0xf2dfb9,
        roughness: 0.86,
        metalness: 0
      });
      const woodMaterial = new THREE.MeshPhysicalMaterial({
        map: wood,
        bumpMap: woodBump,
        bumpScale: 0.0022 * detailScale,
        color: 0x9b6845,
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.17,
        clearcoatRoughness: 0.68
      });
      const darkJoint = new THREE.MeshStandardMaterial({
        color: 0x39261b,
        roughness: 0.84
      });
      const frames = pathFrames(makePath(dimensions));
      const group = new THREE.Group();
      group.name = 'arranhador-curvo';
      const addSweep = (geometry, material, name, shadows = true) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        mesh.castShadow = shadows;
        mesh.receiveShadow = true;
        group.add(mesh);
      };

      addSweep(
        makeSweepGeometry(
          frames,
          scaledY(0.225, height),
          scaledY(0.72, height),
          0.031 * detailScale,
          0.024 * detailScale,
          7,
          0.009 * detailScale
        ),
        weaveMaterial,
        'painel-trancado'
      );
      addWovenRelief(group, frames, dimensions, detailScale);
      addWovenRelief(group, frames, dimensions, detailScale, true);

      const sweeps = [
        [0.207, 0.226, 0.035, 0.028, darkJoint, 'junta-inferior'],
        [0.719, 0.738, 0.035, 0.028, darkJoint, 'junta-superior'],
        [0.168, 0.218, 0.055, 0.047, woodMaterial, 'moldura-inferior'],
        [0.732, 0.785, 0.055, 0.047, woodMaterial, 'moldura-superior'],
        [0.125, 0.166, 0.083, 0.07, woodMaterial, 'base'],
        [0.787, 0.822, 0.1, 0.086, woodMaterial, 'tampo'],
        [BASE_FLOOR, 0.124, 0.057, 0.05, darkJoint, 'plinto']
      ];
      for (const [from, to, outer, inner, material, name] of sweeps) {
        addSweep(
          makeSweepGeometry(
            frames,
            from === BASE_FLOOR ? 0 : scaledY(from, height),
            scaledY(to, height),
            outer * detailScale,
            inner * detailScale
          ),
          material,
          name
        );
      }

      const postBottom = scaledY(0.168, height);
      const postTop = scaledY(0.785, height);
      const cornerDepth = (CORNER_DETAILS.depth / 100) * detailScale;
      const cornerWidth = (CORNER_DETAILS.width / 100) * detailScale;
      const cornerOuterFace = (CORNER_DETAILS.outerOffset / 100) * detailScale;
      const cornerCenterZ = cornerOuterFace - cornerDepth / 2;
      const lateral = dimensions.lateral / 100;
      const radius = dimensions.raio / 100;
      for (const [x, name] of [
        [-lateral / 2, 'montante-quina-c'],
        [lateral / 2 - radius, 'montante-quina-b']
      ]) {
        const geometry = new THREE.BoxGeometry(
          cornerWidth,
          postTop - postBottom,
          cornerDepth
        );
        const mesh = new THREE.Mesh(geometry, woodMaterial);
        mesh.name = name;
        mesh.position.set(x, (postBottom + postTop) / 2, cornerCenterZ);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }

      this.group = group;
      this.el.setObject3D('mesh', group);
    }
  });
}

function registerOrbitRig() {
  if (AFRAME.components['orbit-rig']) return;
  AFRAME.registerComponent('orbit-rig', {
    schema: {
      distance: { default: 2.05 },
      yaw: { default: 42 },
      pitch: { default: 18 }
    },
    init() {
      this.distance = this.data.distance;
      this.yaw = this.data.yaw;
      this.pitch = this.data.pitch;
      this.target = new THREE.Vector3(0, 0.47, -0.04);
      this.minDistance = 1.15;
      this.maxDistance = 3.5;
      this.dragging = false;
      this.desired = {
        distance: this.distance,
        yaw: this.yaw,
        pitch: this.pitch
      };
      this.canvas = this.el.sceneEl.canvas;
      this.onPointerDown = (event) => {
        this.dragging = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        this.canvas.setPointerCapture(event.pointerId);
      };
      this.onPointerMove = (event) => {
        if (!this.dragging) return;
        this.desired.yaw -= (event.clientX - this.lastX) * 0.25;
        this.desired.pitch = THREE.MathUtils.clamp(
          this.desired.pitch + (event.clientY - this.lastY) * 0.2,
          -48,
          72
        );
        this.lastX = event.clientX;
        this.lastY = event.clientY;
      };
      this.onPointerEnd = () => {
        this.dragging = false;
      };
      this.onWheel = (event) => {
        event.preventDefault();
        this.desired.distance = THREE.MathUtils.clamp(
          this.desired.distance + event.deltaY * 0.0017,
          this.minDistance,
          this.maxDistance
        );
      };
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerup', this.onPointerEnd);
      this.canvas.addEventListener('pointercancel', this.onPointerEnd);
      this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    },
    remove() {
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.onPointerEnd);
      this.canvas.removeEventListener('pointercancel', this.onPointerEnd);
      this.canvas.removeEventListener('wheel', this.onWheel);
    },
    tick(_, delta) {
      const ease = 1 - Math.pow(0.001, Math.min(delta, 100) / 1000);
      this.yaw = THREE.MathUtils.lerp(this.yaw, this.desired.yaw, ease);
      this.pitch = THREE.MathUtils.lerp(this.pitch, this.desired.pitch, ease);
      this.distance = THREE.MathUtils.lerp(this.distance, this.desired.distance, ease);
      const phi = THREE.MathUtils.degToRad(90 - this.pitch);
      const theta = THREE.MathUtils.degToRad(this.yaw);
      const position = new THREE.Vector3()
        .setFromSphericalCoords(this.distance, phi, theta)
        .add(this.target);
      this.el.object3D.position.copy(position);
      this.el.object3D.lookAt(this.target);
      this.el.object3D.rotateY(Math.PI);
    },
    setView(yaw, pitch, distance) {
      this.desired = { yaw, pitch, distance };
    },
    setFrame(target, minDistance, maxDistance) {
      this.target.copy(target);
      this.minDistance = minDistance;
      this.maxDistance = maxDistance;
    }
  });
}

registerCurvedScratcher();
registerOrbitRig();

export { AFRAME, THREE };
