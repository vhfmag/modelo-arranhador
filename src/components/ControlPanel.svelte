<script>
  import { onDestroy } from 'svelte';
  import {
    DEFAULT_DIMENSIONS,
    DIMENSION_LIMITS,
    DIMENSION_NAMES,
    planPaths,
    validateDimensions
  } from '../lib/model.js';

  export let dimensions;
  export let currentView;
  export let sofaVisible;
  export let spinning;
  export let collapsed;
  export let onDimensionsChange;
  export let onViewChange;
  export let onSofaToggle;
  export let onSpinToggle;
  export let onReset;
  export let onCollapsedChange;

  const labels = {
    lateral: 'Lateral',
    retorno: 'Retorno',
    altura: 'Altura',
    raio: 'Raio'
  };
  const views = [
    ['iso', 'Perspectiva'],
    ['side', 'Lateral'],
    ['front', 'Frente'],
    ['top', 'Planta']
  ];

  let values = { ...dimensions };
  let lastDimensions = dimensions;
  let validation = validateDimensions(values);
  let updateTimer;
  let toggleButton;

  $: if (dimensions !== lastDimensions) {
    lastDimensions = dimensions;
    values = { ...dimensions };
    validation = validateDimensions(values);
  }
  $: paths = planPaths(dimensions);
  $: toggleLabel = collapsed ? 'Expandir painel' : 'Recolher painel';

  function handleInput() {
    values = { ...values };
    validation = validateDimensions(values);
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      if (validation.valid) onDimensionsChange({ ...values });
    }, 180);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && !collapsed) {
      onCollapsedChange(true);
      requestAnimationFrame(() => toggleButton?.focus());
    }
  }

  onDestroy(() => clearTimeout(updateTimer));
</script>

<svelte:window onkeydown={handleKeydown} />

<aside class:collapsed class="card" aria-label="Detalhes do estudo">
  <div class="card-header">
    <div class="card-title">
      <p class="eyebrow">Modelo paramétrico · v3</p>
      <h1>Arranhador envolvente</h1>
    </div>
    <button
      bind:this={toggleButton}
      class="panel-toggle"
      type="button"
      aria-expanded={!collapsed}
      aria-controls="panelContent"
      title={toggleLabel}
      onclick={() => onCollapsedChange(!collapsed)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m6 15 6-6 6 6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="sr-only">{toggleLabel}</span>
    </button>
  </div>

  <div id="panelContent">
    <p class="copy">
      A face lateral curva 90° e retorna sobre a frente do braço, como uma única casca contínua.
    </p>
    <div class="spec">
      <div class="plan" aria-label="Diagrama da geometria vista de cima">
        <svg viewBox="0 0 120 80" role="img">
          <title>Vista superior com quinas B e C alongadas na direção do retorno</title>
          {#each paths.corners as corner}
            <rect
              x={corner.x}
              y={corner.y}
              width={corner.width}
              height={corner.height}
              rx="1.5"
              fill="#77492e"
            />
          {/each}
          <path
            d={paths.model}
            fill="none"
            stroke="#2d2822"
            stroke-width="15"
            stroke-linecap="round"
          />
          <path
            d={paths.model}
            fill="none"
            stroke="#c6ad82"
            stroke-width="9"
            stroke-linecap="round"
          />
          <path
            d={paths.sofa}
            fill="none"
            stroke="#8b8174"
            stroke-width="1.5"
            stroke-dasharray="3 3"
          />
          {#each paths.corners as corner}
            <text
              x={corner.x + corner.width / 2}
              y={corner.y + corner.height - 2}
              text-anchor="middle"
              font-size="5"
              font-weight="800"
              fill="#fff">{corner.name}</text
            >
          {/each}
          <text x="10" y="8" font-size="7" fill="#776e63">LATERAL</text>
          <text
            x="111"
            y="73"
            font-size="7"
            fill="#776e63"
            transform="rotate(-90 111 73)">FRENTE</text
          >
        </svg>
      </div>

      <div class="measure-grid" aria-label="Medidas do modelo em centímetros">
        {#each DIMENSION_NAMES as name}
          <div class:invalid={validation.invalid.has(name)} class="measure">
            <label for={name}>{labels[name]}</label>
            <input
              id={name}
              {name}
              type="number"
              min={DIMENSION_LIMITS[name][0]}
              max={DIMENSION_LIMITS[name][1]}
              step="1"
              inputmode="decimal"
              bind:value={values[name]}
              oninput={handleInput}
            />
            <span class="unit">cm</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="validation" role="status" aria-live="polite">
      {validation.errors[0] ?? ''}
    </div>

    <div class="controls">
      {#each views as [view, label]}
        <button
          class:active={currentView === view}
          type="button"
          onclick={() => onViewChange(view)}>{label}</button
        >
      {/each}
      <button class:active={sofaVisible} type="button" onclick={onSofaToggle}>Sofá</button>
      <button class:active={spinning} type="button" onclick={onSpinToggle}>Girar</button>
      <button
        class="secondary"
        type="button"
        title="Restaurar as medidas originais"
        onclick={() => {
          values = { ...DEFAULT_DIMENSIONS };
          validation = validateDimensions(values);
          onReset();
        }}>Restaurar padrão</button
      >
    </div>
    <div class="legend">Trama de madeira clara com relevo</div>
  </div>
</aside>
