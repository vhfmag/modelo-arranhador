<script>
  import { onMount } from 'svelte';
  import { THREE } from '../lib/aframe/components.js';
  import { sofaSettings, viewSettings } from '../lib/model.js';

  export let dimensions;
  export let currentView;
  export let sofaVisible;
  export let spinning;

  let scene;
  let rig;
  let model;
  let turntable;
  let sofaContext;
  let sofaBody;
  let sofaArm;
  let sofaSeat;
  let stage;
  let ready = false;

  function updateModel(candidate) {
    model.setAttribute('curved-scratcher', candidate);
    const sofa = sofaSettings(candidate);
    for (const [element, settings] of [
      [sofaBody, sofa.body],
      [sofaArm, sofa.arm],
      [sofaSeat, sofa.seat]
    ]) {
      for (const [name, value] of Object.entries(settings)) {
        element.setAttribute(name, value);
      }
    }
  }

  function updateFrame(candidate, view, animate = true) {
    const orbit = rig.components['orbit-rig'];
    if (!orbit) return;
    const settings = viewSettings(candidate);
    const [yaw, pitch, distance] = settings.views[view];
    orbit.setFrame(new THREE.Vector3(...settings.target), settings.min, settings.max);
    orbit.setView(yaw, pitch, distance);
    if (!animate) {
      orbit.yaw = yaw;
      orbit.pitch = pitch;
      orbit.distance = distance;
    }
    stage.setAttribute('radius', settings.stageRadius);
  }

  function updateSofaVisibility(visible) {
    sofaContext.setAttribute('visible', visible);
    sofaContext.object3D.visible = visible;
  }

  function updateSpin(enabled) {
    if (enabled) {
      turntable.setAttribute(
        'animation',
        'property: rotation; from: 0 0 0; to: 0 360 0; loop: true; dur: 14000; easing: linear'
      );
    } else {
      turntable.removeAttribute('animation');
      turntable.object3D.rotation.y = 0;
    }
  }

  function initialize() {
    updateModel(dimensions);
    updateFrame(dimensions, currentView, false);
    updateSofaVisibility(sofaVisible);
    updateSpin(spinning);
    ready = true;
  }

  $: if (ready) {
    updateModel(dimensions);
    updateFrame(dimensions, currentView);
  }
  $: if (ready) updateSofaVisibility(sofaVisible);
  $: if (ready) updateSpin(spinning);

  onMount(() => {
    if (scene.hasLoaded) {
      initialize();
      return undefined;
    }
    scene.addEventListener('loaded', initialize, { once: true });
    return () => scene.removeEventListener('loaded', initialize);
  });
</script>

<a-scene
  bind:this={scene}
  embedded
  renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
  background="color: #d9d1c5"
  shadow="type: pcfsoft"
  vr-mode-ui="enabled: false"
  loading-screen="backgroundColor: #d9d1c5; dotsColor: #77492e"
>
  <a-entity
    light="type: hemisphere; intensity: 1.15; color: #fff5df; groundColor: #746c64"
  ></a-entity>
  <a-entity
    light="type: directional; intensity: 2.1; color: #fff1d5; castShadow: true;
           shadowMapWidth: 2048; shadowMapHeight: 2048; shadowCameraLeft: -2;
           shadowCameraRight: 2; shadowCameraTop: 2; shadowCameraBottom: -2"
    position="-2.5 4 3"
  ></a-entity>
  <a-entity
    light="type: directional; intensity: .8; color: #c8d8ef"
    position="3 2 -2"
  ></a-entity>

  <a-entity bind:this={rig} orbit-rig="distance: 2.05; yaw: 42; pitch: 18">
    <a-camera
      position="0 0 0"
      fov="39"
      look-controls="enabled: false"
      wasd-controls="enabled: false"
    ></a-camera>
  </a-entity>

  <a-entity bind:this={turntable}>
    <a-entity bind:this={model} curved-scratcher></a-entity>

    <a-entity bind:this={sofaContext} visible="false">
      <a-box
        bind:this={sofaBody}
        position="-.07 .46 -.235"
        width=".76"
        height=".62"
        depth=".38"
        material="color: #f2ede2; roughness: .96; transparent: true; opacity: .25; depthWrite: false"
        shadow="cast: true; receive: true"
      ></a-box>
      <a-box
        bind:this={sofaArm}
        position=".22 .80 -.235"
        width=".19"
        height=".16"
        depth=".38"
        material="color: #faf7ef; roughness: 1; transparent: true; opacity: .31; depthWrite: false"
        shadow="cast: true; receive: true"
      ></a-box>
      <a-box
        bind:this={sofaSeat}
        position="-.20 .74 -.23"
        width=".48"
        height=".13"
        depth=".33"
        rotation="0 0 -5"
        material="color: #f8f4ea; roughness: 1; transparent: true; opacity: .29; depthWrite: false"
        shadow="cast: true; receive: true"
      ></a-box>
    </a-entity>
  </a-entity>

  <a-circle
    bind:this={stage}
    position="0 .001 -.02"
    rotation="-90 0 0"
    radius="1.03"
    material="color: #e9e3d9; roughness: 1"
    shadow="receive: true"
  ></a-circle>
  <a-plane
    position="0 -.006 0"
    rotation="-90 0 0"
    width="200"
    height="200"
    material="color: #d5cdc0; roughness: 1"
    shadow="receive: true"
  ></a-plane>
</a-scene>
