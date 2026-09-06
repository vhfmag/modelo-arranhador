<script>
  import { onMount } from 'svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import ViewerScene from './components/ViewerScene.svelte';
  import {
    DEFAULT_DIMENSIONS,
    dimensionsFromUrl,
    syncDimensionsToUrl
  } from './lib/model.js';

  let dimensions = dimensionsFromUrl();
  let currentView = 'iso';
  let sofaVisible = false;
  let spinning = false;
  let collapsed = false;

  function updateDimensions(candidate) {
    dimensions = { ...candidate };
    syncDimensionsToUrl(dimensions);
  }

  function resetDimensions() {
    updateDimensions(DEFAULT_DIMENSIONS);
  }

  onMount(() => {
    const handlePopstate = () => {
      dimensions = dimensionsFromUrl();
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  });
</script>

<ControlPanel
  {dimensions}
  {currentView}
  {sofaVisible}
  {spinning}
  {collapsed}
  onDimensionsChange={updateDimensions}
  onViewChange={(view) => (currentView = view)}
  onSofaToggle={() => (sofaVisible = !sofaVisible)}
  onSpinToggle={() => (spinning = !spinning)}
  onReset={resetDimensions}
  onCollapsedChange={(value) => (collapsed = value)}
/>

<div class="hint">Arraste para orbitar · role para aproximar</div>

<ViewerScene {dimensions} {currentView} {sofaVisible} {spinning} />
