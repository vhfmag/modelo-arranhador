export const DEFAULT_DIMENSIONS = Object.freeze({
  lateral: 84,
  retorno: 35,
  altura: 72,
  raio: 11
});

export const DIMENSION_LIMITS = Object.freeze({
  lateral: [50, 200],
  retorno: [20, 100],
  altura: [40, 120],
  raio: [5, 30]
});

export const DIMENSION_NAMES = Object.keys(DEFAULT_DIMENSIONS);

export function validateDimensions(candidate) {
  const errors = [];
  const invalid = new Set();

  for (const name of DIMENSION_NAMES) {
    const value = candidate[name];
    const [minimum, maximum] = DIMENSION_LIMITS[name];
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      invalid.add(name);
      errors.push(`${name[0].toUpperCase() + name.slice(1)}: use ${minimum}–${maximum} cm.`);
    }
  }

  if (
    Number.isFinite(candidate.raio) &&
    Number.isFinite(candidate.lateral) &&
    Number.isFinite(candidate.retorno)
  ) {
    const maximumRadius = Math.min(
      candidate.retorno - 2,
      candidate.lateral * 0.45,
      DIMENSION_LIMITS.raio[1]
    );
    if (candidate.raio > maximumRadius) {
      invalid.add('raio');
      errors.push(`Raio: máximo de ${Math.floor(maximumRadius)} cm para estas medidas.`);
    }
  }

  return { valid: errors.length === 0, errors, invalid };
}

export function formatValue(value) {
  return Number(value.toFixed(2)).toString();
}

export function dimensionsFromUrl(url = window.location.href) {
  const params = new URL(url).searchParams;
  const candidate = { ...DEFAULT_DIMENSIONS };

  for (const name of DIMENSION_NAMES) {
    if (!params.has(name)) continue;
    const value = Number(params.get(name));
    if (Number.isFinite(value)) candidate[name] = value;
  }

  return validateDimensions(candidate).valid ? candidate : { ...DEFAULT_DIMENSIONS };
}

export function syncDimensionsToUrl(candidate) {
  const url = new URL(window.location.href);
  for (const name of DIMENSION_NAMES) {
    if (candidate[name] === DEFAULT_DIMENSIONS[name]) url.searchParams.delete(name);
    else url.searchParams.set(name, formatValue(candidate[name]));
  }
  history.replaceState({ dimensions: candidate }, '', url);
}

export function planPaths(candidate) {
  const scale = Math.min(90 / candidate.lateral, 51 / candidate.retorno);
  const startX = 10;
  const startY = 18;
  const radius = candidate.raio * scale;
  const lineStart = startX + radius;
  const lineEnd = startX + (candidate.lateral - candidate.raio) * scale;
  const endX = startX + candidate.lateral * scale;
  const curveEndY = startY + radius;
  const endY = startY + candidate.retorno * scale;

  return {
    model: `M${startX} ${endY} V${curveEndY} A${radius} ${radius} 0 0 1 ${lineStart} ${startY} H${lineEnd} A${radius} ${radius} 0 0 1 ${endX} ${curveEndY} V${endY}`,
    sofa: `M${startX + 13} ${endY - 7} V${curveEndY + 12} Q${startX + 13} ${startY + 14} ${lineStart + 7} ${startY + 14} H${lineEnd - 7} Q${endX - 13} ${startY + 14} ${endX - 13} ${curveEndY + 12} V${endY - 7}`,
    corners: [
      { name: 'C', x: lineStart, y: startY },
      { name: 'B', x: lineEnd, y: startY }
    ]
  };
}

export function sofaSettings(candidate) {
  const lateral = candidate.lateral / 100;
  const retorno = candidate.retorno / 100;
  const altura = candidate.altura / 100;
  const depth = Math.max(0.16, retorno - 0.04);
  const bodyHeight = altura * 0.86;

  return {
    body: {
      width: lateral * 0.9,
      height: bodyHeight,
      depth,
      position: `${-lateral * 0.03} ${bodyHeight / 2} ${-retorno / 2 - 0.02}`
    },
    arm: {
      width: Math.max(0.13, lateral * 0.23),
      height: altura * 0.22,
      depth,
      position: `${lateral * 0.28} ${altura * 0.91} ${-retorno / 2 - 0.02}`
    },
    seat: {
      width: lateral * 0.57,
      height: altura * 0.18,
      depth: Math.max(0.13, depth - 0.05),
      position: `${-lateral * 0.23} ${altura * 0.82} ${-retorno / 2 - 0.02}`
    }
  };
}

export function viewSettings(candidate) {
  const lateral = candidate.lateral / 100;
  const retorno = candidate.retorno / 100;
  const altura = candidate.altura / 100;
  const extent = Math.max(lateral, retorno * 1.35, altura);
  const base = Math.max(1.25, extent * 2.44);

  return {
    target: [0, altura * 0.55, -retorno * 0.12],
    min: Math.max(0.75, extent * 1.15),
    max: Math.max(3.5, extent * 5),
    stageRadius: Math.max(1.03, Math.max(candidate.lateral, candidate.retorno) / 75),
    views: {
      iso: [42, 18, base],
      side: [2, 5, base * 0.9],
      front: [91, 4, base * 0.84],
      top: [34, 68, base]
    }
  };
}
