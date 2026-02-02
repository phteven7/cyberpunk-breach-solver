/**
 * Cyberpunk 2077 Breach Protocol Solver
 *
 * Solves the breach protocol minigame by finding optimal paths
 * through the code matrix that satisfy target sequences.
 */

/* ================= DATA ================= */

const CODE_MAP = {
  '1': '1C', '5': '55', '7': '7A',
  'B': 'BD', 'E': 'E9', 'F': 'FF'
};

const REVERSE_CODE_MAP = Object.fromEntries(
  Object.entries(CODE_MAP).map(([k, v]) => [v, k])
);

const PRESET_MATRIX_6 = `
7A 55 E9 E9 1C 55
55 7A 1C 7A E9 55
55 1C 1C 55 E9 BD
BD 1C 7A 1C 55 BD
BD 55 BD 7A 1C 1C
1C 55 55 7A 55 7A
`.trim();

const PRESET_SEQUENCES = `5 5
5 7 B
1 7 5`;

let lastDrawnPath = null;

/* ================= VISUAL HELPERS ================= */

function setCellVisualFromChar(inputEl) {
  const cell = inputEl.closest('.cell');
  const label = cell.querySelector('.code-label');
  const v = (inputEl.value || '').toUpperCase();

  if (v && CODE_MAP[v]) {
    label.textContent = CODE_MAP[v];
    cell.classList.add('has-value');
  } else {
    label.textContent = '';
    cell.classList.remove('has-value');
  }
}

/* ================= OVERLAY ================= */

function clearPathOverlay() {
  const svg = document.getElementById('pathOverlay');
  if (svg) svg.innerHTML = '';
  lastDrawnPath = null;
}

function drawPathOverlay(path) {
  lastDrawnPath = path;

  const svg = document.getElementById('pathOverlay');
  const grid = document.getElementById('matrixGrid');
  if (!svg || !grid || !path || path.length < 2) return;

  svg.innerHTML = '';

  const gridRect = grid.getBoundingClientRect();
  const w = gridRect.width;
  const h = gridRect.height;

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  // defs/arrow marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'arrowHead');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '10');
  marker.setAttribute('refX', '8');
  marker.setAttribute('refY', '5');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');

  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  arrowPath.setAttribute('fill', 'rgba(0,255,159,0.55)');
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const size = parseInt(document.getElementById('gridSize').value, 10);

  const pts = path.map(([r, c]) => {
    const idx = r * size + c;
    const input = document.querySelector(`[data-index="${idx}"]`);
    const rect = input.getBoundingClientRect();
    return {
      x: (rect.left - gridRect.left) + rect.width / 2,
      y: (rect.top - gridRect.top) + rect.height / 2
    };
  });

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    line.setAttribute('stroke', '#00ff9f');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.40');
    line.setAttribute('marker-end', 'url(#arrowHead)');
    line.style.filter = 'drop-shadow(0 0 4px rgba(0,255,159,0.55))';

    svg.appendChild(line);
  }

  pts.forEach((p, i) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x);
    dot.setAttribute('cy', p.y);
    dot.setAttribute('r', i === 0 ? '4' : '3');
    dot.setAttribute('fill', '#00ff9f');
    dot.setAttribute('opacity', i === 0 ? '0.75' : '0.35');
    dot.style.filter = 'drop-shadow(0 0 3px rgba(0,255,159,0.55))';
    svg.appendChild(dot);
  });
}

window.addEventListener('resize', () => {
  if (lastDrawnPath) drawPathOverlay(lastDrawnPath);
});

/* ================= GRID ================= */

function createGrid() {
  const size = parseInt(document.getElementById('gridSize').value, 10);
  const grid = document.getElementById('matrixGrid');
  grid.className = `matrix-grid size-${size}`;
  grid.innerHTML = '';

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.className = 'cell-input';
    input.dataset.index = i;
    input.addEventListener('input', handleCellInput);
    input.addEventListener('keydown', handleCellKeydown);

    const label = document.createElement('div');
    label.className = 'code-label';

    const badge = document.createElement('div');
    badge.className = 'step-badge';

    cell.appendChild(input);
    cell.appendChild(label);
    cell.appendChild(badge);
    grid.appendChild(cell);
  }

  clearHighlights();

  const first = grid.querySelector('.cell-input');
  if (first) first.focus();

  // Auto-load preset on initial 6x6 render
  if (size === 6) {
    try { loadPresetMatrixFromCodes(PRESET_MATRIX_6); } catch (_) {}
  }
}

function handleCellInput(e) {
  const input = e.target;
  const value = (input.value || '').toUpperCase();
  input.value = value;

  // Update visual label and has-value state
  setCellVisualFromChar(input);

  // Auto-advance only if valid
  if (value && CODE_MAP[value]) {
    moveToNextCell(parseInt(input.dataset.index, 10));
  }
}

function handleCellKeydown(e) {
  if (e.key === 'Enter') {
    const size = parseInt(document.getElementById('gridSize').value, 10);
    const idx = parseInt(e.target.dataset.index, 10);
    const row = Math.floor(idx / size);
    const nextRowStart = (row + 1) * size;

    if (nextRowStart < size * size) {
      document.querySelector(`[data-index="${nextRowStart}"]`).focus();
    } else {
      document.getElementById('sequences').focus();
    }
    e.preventDefault();
  }
}

function moveToNextCell(currentIdx) {
  const size = parseInt(document.getElementById('gridSize').value, 10);
  const nextIdx = currentIdx + 1;
  if (nextIdx < size * size) {
    const next = document.querySelector(`[data-index="${nextIdx}"]`);
    next.focus();
    next.select();
  }
}

/* ================= PRESET ================= */

function loadPresetMatrixFromCodes(codeText) {
  const size = parseInt(document.getElementById('gridSize').value, 10);
  const tokens = codeText.trim().split(/\s+/);

  if (tokens.length !== size * size) {
    throw new Error(`Preset has ${tokens.length} cells but grid is ${size}x${size} (${size * size}).`);
  }

  const inputs = document.querySelectorAll('.cell-input');
  tokens.forEach((code, i) => {
    const normalized = code.toUpperCase();
    const char = REVERSE_CODE_MAP[normalized];
    if (!char) throw new Error(`Preset contains unknown code: ${code}`);

    inputs[i].value = char;
    setCellVisualFromChar(inputs[i]); // updates label + has-value
  });
}

function loadPreset() {
  document.getElementById('gridSize').value = '6';
  createGrid();
  loadPresetMatrixFromCodes(PRESET_MATRIX_6);
  document.getElementById('sequences').value = PRESET_SEQUENCES;
  document.getElementById('results').innerHTML = '';
  clearHighlights();

  const first = document.querySelector('[data-index="0"]');
  if (first) first.focus();
}

/* ================= MATRIX / SEQUENCES ================= */

function getMatrix() {
  const size = parseInt(document.getElementById('gridSize').value, 10);
  const inputs = document.querySelectorAll('.cell-input');
  const matrix = [];

  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const val = (inputs[r * size + c].value || '').toUpperCase();
      const code = CODE_MAP[val];
      if (!code) throw new Error(`Invalid cell at Row ${r + 1}, Col ${c + 1}`);
      row.push(code);
    }
    matrix.push(row);
  }
  return matrix;
}

function getSequences() {
  const text = document.getElementById('sequences').value.trim();
  if (!text) throw new Error('No sequences entered');

  const sequences = [];
  for (const line of text.split('\n')) {
    const seq = [];
    for (const ch of line.trim().split(/\s+/)) {
      const code = CODE_MAP[ch.toUpperCase()];
      if (!code) throw new Error(`Invalid code '${ch}' in sequence`);
      seq.push(code);
    }
    if (seq.length > 0) sequences.push(seq);
  }
  if (sequences.length === 0) throw new Error('No valid sequences');
  return sequences;
}

/* ================= UI HIGHLIGHTING ================= */

function highlightPath(path) {
  const size = parseInt(document.getElementById('gridSize').value, 10);

  path.forEach(([r, c], i) => {
    const idx = r * size + c;
    const input = document.querySelector(`[data-index="${idx}"]`);
    if (!input) return;

    const cell = input.closest('.cell');
    if (cell) {
      cell.classList.add('is-path');
      if (i === 0) cell.classList.add('is-start');
      if (i === path.length - 1) cell.classList.add('is-end');

      const badge = cell.querySelector('.step-badge');
      if (badge) badge.textContent = String(i + 1);
    }
  });

  drawPathOverlay(path);
}

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('is-path', 'is-start', 'is-end');
  });
  document.querySelectorAll('.step-badge').forEach(b => b.textContent = '');
  clearPathOverlay();
}

function clearAll() {
  document.querySelectorAll('.cell-input').forEach(input => {
    input.value = '';
    setCellVisualFromChar(input); // clears label + has-value
  });
  document.getElementById('sequences').value = '';
  document.getElementById('results').innerHTML = '';
  clearHighlights();

  const first = document.querySelector('[data-index="0"]');
  if (first) first.focus();
}

/* ================= SOLVE ================= */

function findSequencePosition(buffer, seq) {
  for (let i = 0; i <= buffer.length - seq.length; i++) {
    let match = true;
    for (let j = 0; j < seq.length; j++) {
      if (buffer[i + j] !== seq[j]) { match = false; break; }
    }
    if (match) return i;
  }
  return -1;
}

function solve() {
  clearHighlights();
  const results = document.getElementById('results');

  try {
    const matrix = getMatrix();
    const sequences = getSequences();
    const bufferSize = parseInt(document.getElementById('bufferSize').value, 10);

    const solver = new BreachSolver(matrix, sequences, bufferSize);
    const solution = solver.solve();

    if (!solution) {
      results.innerHTML = '<span class="error">NO SOLUTION FOUND!\n\nTry increasing buffer size.</span>';
      return;
    }

    let output = '='.repeat(45) + '\n';
    output += 'SOLUTION FOUND\n';
    output += '='.repeat(45) + '\n\n';

    output += `Buffer (${solution.buffer.length}/${bufferSize}):\n`;
    output += '  ' + solution.buffer.join(' \u2192 ') + '\n\n';

    output += `Sequences: ${solution.score}/${sequences.length}\n`;
    sequences.forEach((seq, i) => {
      const status = solution.completed[i] ? '\u2713' : '\u2717';
      const seqStr = seq.join(' \u2192 ');
      if (solution.completed[i]) {
        const pos = findSequencePosition(solution.buffer, seq);
        output += `  ${status} ${seqStr} (pos ${pos + 1}-${pos + seq.length})\n`;
      } else {
        output += `  ${status} ${seqStr}\n`;
      }
    });

    output += '\nPath (in order):\n';
    solution.path.forEach((pos, i) => {
      const [r, c] = pos;
      const code = matrix[r][c];
      const dir = i === 0 ? 'START' : (i % 2 === 1 ? 'COL \u2193' : 'ROW \u2192');
      output += `  ${i + 1}. Row ${r + 1}, Col ${c + 1} = ${code} (${dir})\n`;
    });

    results.innerHTML = `<span class="success">${output}</span>`;
    highlightPath(solution.path);

  } catch (err) {
    results.innerHTML = `<span class="error">Error: ${err.message}</span>`;
  }
}

/* ================= SOLVER CLASS ================= */

class BreachSolver {
  constructor(matrix, sequences, bufferSize) {
    this.matrix = matrix;
    this.sequences = sequences;
    this.bufferSize = bufferSize;
    this.gridSize = matrix.length;
    this.bestSolution = null;
    this.bestScore = -1;
  }

  solve() {
    this.bestSolution = null;
    this.bestScore = -1;

    const targets = this.generateTargets();
    targets.sort((a, b) => {
      if (b.seqIndices.size !== a.seqIndices.size) return b.seqIndices.size - a.seqIndices.size;
      return a.buffer.length - b.buffer.length;
    });

    for (const target of targets) {
      if (target.buffer.length > this.bufferSize) continue;

      const path = this.findPathForBuffer(target.buffer);
      if (path) {
        const score = target.seqIndices.size;
        if (score > this.bestScore) {
          this.bestScore = score;
          const completed = this.sequences.map((_, i) => target.seqIndices.has(i));
          const actualBuffer = path.map(([r, c]) => this.matrix[r][c]);
          this.bestSolution = { path, buffer: actualBuffer, completed, score };
          if (score === this.sequences.length) return this.bestSolution;
        }
      }
    }
    return this.bestSolution;
  }

  generateTargets() {
    const targets = [];
    const n = this.sequences.length;

    for (let size = n; size > 0; size--) {
      for (const indices of this.combinations([...Array(n).keys()], size)) {
        const seqs = indices.map(i => this.sequences[i]);
        for (const perm of this.permutations(seqs)) {
          const merged = this.mergeAll(perm);
          if (merged && merged.length <= this.bufferSize) {
            targets.push({ buffer: merged, seqIndices: new Set(indices) });
          }
        }
      }
    }

    const seen = new Set();
    return targets.filter(t => {
      const key = JSON.stringify([t.buffer, [...t.seqIndices].sort()]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  *combinations(arr, r) {
    if (r === 0) { yield []; return; }
    if (arr.length === 0) return;
    const [first, ...rest] = arr;
    for (const combo of this.combinations(rest, r - 1)) yield [first, ...combo];
    for (const combo of this.combinations(rest, r)) yield combo;
  }

  *permutations(arr) {
    if (arr.length <= 1) { yield arr; return; }
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of this.permutations(rest)) yield [arr[i], ...perm];
    }
  }

  mergeAll(seqs) {
    if (seqs.length === 0) return [];
    let result = [...seqs[0]];
    for (let i = 1; i < seqs.length; i++) {
      result = this.mergeTwo(result, seqs[i]);
      if (!result) return null;
    }
    return result;
  }

  mergeTwo(seq1, seq2) {
    if (seq1.length === 0) return [...seq2];
    if (seq2.length === 0) return [...seq1];

    const maxOverlap = Math.min(seq1.length, seq2.length);
    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      let match = true;
      for (let i = 0; i < overlap; i++) {
        if (seq1[seq1.length - overlap + i] !== seq2[i]) { match = false; break; }
      }
      if (match) return [...seq1, ...seq2.slice(overlap)];
    }
    return [...seq1, ...seq2];
  }

  findPathForBuffer(targetBuffer) {
    const maxFiller = this.bufferSize - targetBuffer.length;
    for (let filler = 0; filler <= maxFiller; filler++) {
      const path = this.searchPath(targetBuffer, filler);
      if (path) return path;
    }
    return null;
  }

  searchPath(targetBuffer, numFiller) {
    for (let col = 0; col < this.gridSize; col++) {
      const result = this.dfsPath(
        targetBuffer, 0, numFiller, [[0, col]],
        new Set([`0,${col}`]), false, this.matrix[0][col]
      );
      if (result) return result;
    }
    return null;
  }

  dfsPath(targetBuffer, targetIdx, fillerRemaining, path, visited, selectFromRow, currentCode) {
    if (targetIdx < targetBuffer.length && currentCode === targetBuffer[targetIdx]) {
      targetIdx++;
    } else if (fillerRemaining > 0) {
      fillerRemaining--;
    } else {
      return null;
    }

    if (targetIdx === targetBuffer.length) return path;
    if (path.length >= this.bufferSize) return null;

    const [lastRow, lastCol] = path[path.length - 1];
    const candidates = selectFromRow
      ? [...Array(this.gridSize).keys()].map(c => [lastRow, c])
      : [...Array(this.gridSize).keys()].map(r => [r, lastCol]);

    for (const [r, c] of candidates) {
      const key = `${r},${c}`;
      if (!visited.has(key)) {
        const result = this.dfsPath(
          targetBuffer, targetIdx, fillerRemaining,
          [...path, [r, c]],
          new Set([...visited, key]),
          !selectFromRow,
          this.matrix[r][c]
        );
        if (result) return result;
      }
    }
    return null;
  }
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', createGrid);
