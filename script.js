class MemoryBlock {
  constructor(size, free = true, pid = 'None', startAddress = 0) {
    this.size = size;
    this.free = free;
    this.pid = pid;
    this.startAddress = startAddress;
  }
}

class MemoryManager {
  constructor() {
    this.memory = [];
    this.totalSize = 0;
    this.processColors = {};
    this.colorIndex = 0;
    this.nextFitIndex = 0;
    this.colors = [
      '#7185ee', '#e58a5d', '#a16bd1', '#1d9a8a', '#d96383',
      '#be9637', '#4c91c5', '#8170c8', '#d26b43', '#318f68',
      '#c45eae', '#6076a8', '#a77b54', '#538d91', '#bb6571'
    ];
  }

  initMemory(totalSize) {
    if (!Number.isSafeInteger(totalSize) || totalSize < 1) {
      logMessage('Total memory must be a positive whole number of bytes.', 'error');
      return false;
    }

    this.memory = [new MemoryBlock(totalSize)];
    this.totalSize = totalSize;
    this.processColors = {};
    this.colorIndex = 0;
    this.nextFitIndex = 0;
    logMessage(`Memory initialized with ${totalSize} bytes.`, 'info');
    this.updateUI();
    switchTab('allocate');
    return true;
  }

  mergeFreeBlocks() {
    let mergedAny = false;
    for (let i = 0; i < this.memory.length - 1; i++) {
      if (this.memory[i].free && this.memory[i + 1].free) {
        this.memory[i].size += this.memory[i + 1].size;
        this.memory.splice(i + 1, 1);
        mergedAny = true;
        i--;
        if (this.nextFitIndex > i + 1) {
          this.nextFitIndex--;
        }
      }
    }
    if (mergedAny) {
      this.nextFitIndex = this.memory.length ? this.nextFitIndex % this.memory.length : 0;
      logMessage('Adjacent free blocks merged.', 'info');
    }
    return mergedAny;
  }

  findPlacementIndex(size, type) {
    const fits = this.memory
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.free && block.size >= size);

    if (type === 'first') {
      return fits.length ? fits[0].index : -1;
    }
    if (type === 'next') {
      for (let offset = 0; offset < this.memory.length; offset++) {
        const index = (this.nextFitIndex + offset) % this.memory.length;
        if (this.memory[index].free && this.memory[index].size >= size) {
          return index;
        }
      }
      return -1;
    }
    if (type === 'best' && fits.length) {
      return fits.reduce((best, current) =>
        current.block.size < best.block.size ? current : best
      ).index;
    }
    if (type === 'worst' && fits.length) {
      return fits.reduce((worst, current) =>
        current.block.size > worst.block.size ? current : worst
      ).index;
    }
    return -1;
  }

  allocate(pid, size, type) {
    pid = pid.trim();
    if (!Number.isSafeInteger(size) || size <= 0) {
      logMessage('Allocation size must be a positive whole number of bytes.', 'error');
      return false;
    }
    if (!pid) {
      logMessage('Process ID cannot be empty.', 'error');
      return false;
    }
    if (this.memory.some(block => !block.free && block.pid === pid)) {
      logMessage(`Process ID "${pid}" already exists.`, 'error');
      return false;
    }
    if (!['first', 'next', 'best', 'worst'].includes(type)) {
      logMessage('Choose a valid allocation strategy.', 'error');
      return false;
    }

    const selectedIndex = this.findPlacementIndex(size, type);
    if (selectedIndex === -1) {
      const freeMemory = this.memory.reduce((sum, block) => sum + (block.free ? block.size : 0), 0);
      const largestFree = this.memory.reduce((largest, block) =>
        block.free ? Math.max(largest, block.size) : largest
      , 0);
      logMessage(
        `Not enough contiguous memory for ${pid} (${size} bytes). ${freeMemory} bytes are free; the largest free block is ${largestFree} bytes.`,
        'error'
      );
      return false;
    }

    if (!this.processColors[pid]) {
      this.processColors[pid] = this.colors[this.colorIndex % this.colors.length];
      this.colorIndex++;
    }

    const block = this.memory[selectedIndex];
    if (block.size > size) {
      const remainingSize = block.size - size;
      const remainingStart = block.startAddress + size;
      this.memory.splice(selectedIndex + 1, 0, new MemoryBlock(remainingSize, true, 'None', remainingStart));
      block.size = size;
    }

    block.free = false;
    block.pid = pid;
    if (type === 'next') {
      this.nextFitIndex = (selectedIndex + 1) % this.memory.length;
    }

    logMessage(`Allocated ${size} bytes to ${pid} using ${type} fit.`, 'success');
    this.updateUI();
    return true;
  }

  deallocate(pid) {
    const block = this.memory.find(region => !region.free && region.pid === pid);
    if (!block) {
      logMessage(`Process ${pid} was not found.`, 'error');
      return false;
    }

    block.free = true;
    block.pid = 'None';
    logMessage(`Released memory for process ${pid}.`, 'info');
    this.mergeFreeBlocks();
    this.updateUI();
    return true;
  }

  calculateStats() {
    const usedMemory = this.memory.reduce((sum, block) => sum + (block.free ? 0 : block.size), 0);
    const freeBlocks = this.memory.filter(block => block.free);
    const freeMemory = freeBlocks.reduce((sum, block) => sum + block.size, 0);
    const largestFree = freeBlocks.reduce((largest, block) => Math.max(largest, block.size), 0);
    const fragmentation = freeMemory > 0
      ? ((1 - largestFree / freeMemory) * 100).toFixed(1)
      : '0.0';
    const usedPercent = this.totalSize > 0 ? ((usedMemory / this.totalSize) * 100).toFixed(1) : '0.0';
    const freePercent = this.totalSize > 0 ? ((freeMemory / this.totalSize) * 100).toFixed(1) : '0.0';

    document.getElementById('statTotal').textContent = this.totalSize
      ? `${this.totalSize.toLocaleString()} bytes`
      : 'Not initialized';
    document.getElementById('statUsed').textContent = `${usedMemory.toLocaleString()} bytes`;
    document.getElementById('statUsedPercent').textContent = `${usedPercent}% of capacity`;
    document.getElementById('statFree').textContent = `${freeMemory.toLocaleString()} bytes`;
    document.getElementById('statFreePercent').textContent = `${freePercent}% of capacity`;
    document.getElementById('statFragmentation').textContent = `${fragmentation}%`;
    document.getElementById('statLargestFree').textContent = `${largestFree.toLocaleString()} bytes`;
  }

  updateUI() {
    this.updateMemoryVisual();
    this.updateMemoryTable();
    this.updateProcessList();
    this.calculateStats();
    document.getElementById('blockCount').textContent =
      `${this.memory.length} ${this.memory.length === 1 ? 'region' : 'regions'}`;
    updateAllocationPreview();
  }

  updateMemoryVisual() {
    const memoryVisual = document.getElementById('memoryVisual');
    memoryVisual.replaceChildren();
    document.getElementById('memoryEnd').textContent = this.totalSize
      ? `${this.totalSize.toLocaleString()} bytes`
      : '0 bytes';

    if (!this.totalSize) {
      memoryVisual.setAttribute('aria-label', 'Memory map. Initialize memory to begin.');
      const emptyState = document.createElement('p');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'Initialize memory to see the address space.';
      memoryVisual.appendChild(emptyState);
      return;
    }

    const segments = this.memory.map(block =>
      `${block.free ? 'free' : `process ${block.pid}`} ${block.size} bytes`
    );
    memoryVisual.setAttribute('aria-label', `Memory map: ${segments.join(', ')}.`);

    this.memory.forEach((block, blockIndex) => {
      const segment = document.createElement('div');
      segment.className = `memory-block ${block.free ? 'free' : 'allocated'}`;
      segment.dataset.regionIndex = String(blockIndex);
      segment.style.width = `${(block.size / this.totalSize) * 100}%`;
      if (!block.free) {
        segment.style.setProperty('--block-color', this.processColors[block.pid]);
      }
      segment.title = `Region ${blockIndex + 1}: ${block.free ? 'Free' : `Process ${block.pid}`} · ${block.size} bytes · address ${block.startAddress}–${block.startAddress + block.size - 1}`;
      const label = document.createElement('span');
      label.textContent = block.free ? `Free · ${block.size}` : `${block.pid} · ${block.size}`;
      segment.appendChild(label);
      memoryVisual.appendChild(segment);
    });

    if (this.memory.length) {
      const pointer = document.createElement('div');
      pointer.className = 'current-pointer';
      pointer.setAttribute('aria-hidden', 'true');
      let pointerPosition = this.memory
        .slice(0, this.nextFitIndex)
        .reduce((sum, block) => sum + block.size, 0);
      if (this.nextFitIndex < this.memory.length) {
        pointerPosition += this.memory[this.nextFitIndex].size / 2;
      }
      pointer.style.left = `${(pointerPosition / this.totalSize) * 100}%`;
      memoryVisual.appendChild(pointer);
    }
  }

  updateMemoryTable() {
    const tableBody = document.getElementById('memoryTableBody');
    tableBody.replaceChildren();
    if (!this.memory.length) {
      const row = tableBody.insertRow();
      row.className = 'empty-row';
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.textContent = 'No regions yet. Initialize memory to get started.';
      return;
    }

    this.memory.forEach((block, index) => {
      const row = tableBody.insertRow();
      row.dataset.regionIndex = String(index);
      const values = [
        String(index + 1),
        block.startAddress.toLocaleString(),
        (block.startAddress + block.size - 1).toLocaleString(),
        `${block.size.toLocaleString()} bytes`
      ];
      values.forEach(value => {
        const cell = row.insertCell();
        cell.textContent = value;
      });

      const statusCell = row.insertCell();
      const status = document.createElement('span');
      status.className = `status-pill${block.free ? '' : ' allocated'}`;
      status.textContent = block.free ? 'Free' : 'Allocated';
      statusCell.appendChild(status);

      const processCell = row.insertCell();
      processCell.textContent = block.free ? '—' : block.pid;
    });
  }

  updateProcessList() {
    const processSelect = document.getElementById('processToFree');
    const currentValue = processSelect.value;
    const processes = this.memory.filter(block => !block.free).map(block => block.pid);
    processSelect.replaceChildren();

    if (!processes.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No processes allocated';
      processSelect.appendChild(option);
      processSelect.disabled = true;
      return;
    }

    processes.forEach(pid => {
      const option = document.createElement('option');
      option.value = pid;
      option.textContent = pid;
      processSelect.appendChild(option);
    });
    processSelect.disabled = false;
    if (processes.includes(currentValue)) {
      processSelect.value = currentValue;
    }
  }
}

function logMessage(message, type = 'info') {
  const entry = document.createElement('p');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  const logContainer = document.getElementById('logContainer');
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function switchTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll('[data-panel]').forEach(panel => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

const memoryManager = new MemoryManager();

const strategyDescriptions = {
  first: 'Scans from the beginning and selects the first free block large enough.',
  next: 'Continues from the last next-fit position and selects the next block that fits.',
  best: 'Selects the smallest free block that can satisfy the request.',
  worst: 'Selects the largest free block that can satisfy the request.'
};

function updateAllocationPreview() {
  const preview = document.getElementById('allocationPreview');
  const requestedSize = Number(document.getElementById('memorySize').value);
  const processId = document.getElementById('processId').value.trim();
  const strategy = document.getElementById('fitType').value;
  document.querySelectorAll('.preview-target, .preview-row').forEach(element => {
    element.classList.remove('preview-target', 'preview-row');
  });
  preview.classList.remove('has-match', 'no-match');

  if (!memoryManager.memory.length) {
    preview.textContent = 'Initialize memory to preview a placement.';
    return;
  }

  if (!Number.isSafeInteger(requestedSize) || requestedSize <= 0) {
    preview.textContent = `${strategyDescriptions[strategy]} Enter a positive whole-number size to see the selected block.`;
    return;
  }

  if (processId && memoryManager.memory.some(block => !block.free && block.pid === processId)) {
    preview.classList.add('no-match');
    preview.textContent = `Process ID "${processId}" is already in use. Choose another ID to preview a placement.`;
    return;
  }

  const selectedIndex = memoryManager.findPlacementIndex(requestedSize, strategy);
  if (selectedIndex === -1) {
    const freeMemory = memoryManager.memory.reduce((sum, block) => sum + (block.free ? block.size : 0), 0);
    const largestFree = memoryManager.memory.reduce((largest, block) =>
      block.free ? Math.max(largest, block.size) : largest
    , 0);
    preview.classList.add('no-match');
    preview.textContent = `${strategyDescriptions[strategy]} No single free block fits ${requestedSize} bytes. ${freeMemory} bytes are free in total; the largest block is ${largestFree} bytes.`;
    return;
  }

  const block = memoryManager.memory[selectedIndex];
  const visual = document.querySelector(`.memory-block[data-region-index="${selectedIndex}"]`);
  const row = document.querySelector(`#memoryTableBody tr[data-region-index="${selectedIndex}"]`);
  if (visual) visual.classList.add('preview-target');
  if (row) row.classList.add('preview-row');
  preview.classList.add('has-match');
  preview.textContent = `${strategyDescriptions[strategy]} Preview: region ${selectedIndex + 1}, address ${block.startAddress}–${block.startAddress + block.size - 1} (${block.size} bytes).`;
}

document.getElementById('memorySize').addEventListener('input', updateAllocationPreview);
document.getElementById('processId').addEventListener('input', updateAllocationPreview);
document.getElementById('fitType').addEventListener('change', updateAllocationPreview);

document.getElementById('loadDemo').addEventListener('click', () => {
  memoryManager.initMemory(1000);
  [
    ['P1', 100],
    ['P2', 250],
    ['P3', 200],
    ['P4', 150],
    ['P5', 300]
  ].forEach(([pid, size]) => memoryManager.allocate(pid, size, 'first'));
  ['P1', 'P3', 'P5'].forEach(pid => memoryManager.deallocate(pid));
  document.getElementById('processId').value = 'P-new';
  document.getElementById('memorySize').value = '150';
  document.getElementById('fitType').value = 'first';
  switchTab('allocate');
  updateAllocationPreview();
});

document.querySelectorAll('[data-tab]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].focus();
    switchTab(tabs[nextIndex].dataset.tab);
  });
});

document.getElementById('setupForm').addEventListener('submit', event => {
  event.preventDefault();
  const totalMemory = Number(document.getElementById('totalMemory').value);
  memoryManager.initMemory(totalMemory);
});

document.getElementById('allocateForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!memoryManager.memory.length) {
    logMessage('Initialize memory before allocating a process.', 'error');
    switchTab('setup');
    return;
  }
  const pidInput = document.getElementById('processId');
  const sizeInput = document.getElementById('memorySize');
  const succeeded = memoryManager.allocate(
    pidInput.value,
    Number(sizeInput.value),
    document.getElementById('fitType').value
  );
  if (succeeded) {
    pidInput.value = '';
    sizeInput.value = '';
    updateAllocationPreview();
  }
});

document.getElementById('deallocateForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!memoryManager.memory.length) {
    logMessage('Initialize memory before releasing a process.', 'error');
    switchTab('setup');
    return;
  }
  const processToFree = document.getElementById('processToFree').value;
  if (!processToFree) {
    logMessage('There are no allocated processes to release.', 'error');
    return;
  }
  memoryManager.deallocate(processToFree);
});
