# Memory Lab — Allocation Simulator

Memory Lab is a small, browser-based teaching tool for visualizing **contiguous memory allocation**. It models a single memory space, lets you assign regions to processes, and shows how the selected allocation strategy affects free space and fragmentation.

## Run it

1. Keep `memory-allocation-simulation.html`, `styles.css`, and `script.js` in the same folder.
2. Open `memory-allocation-simulation.html` in a modern browser.
3. Enter a total memory capacity in bytes and select **Initialize memory**.
4. Open **Allocate** to enter a process ID and requested size, choose a fit strategy, and allocate the process.
5. Open **Release** to return a process's region to free memory. Neighboring free regions are automatically merged.
6. Observe the live memory map, block table, statistics, and activity log as you experiment. Initialize again to reset the simulation.

No server, installation, external assets, or dependencies are required.

Use the **Dark mode** switch in the header to change themes. Your choice is saved in this browser; before you select a theme, the simulator follows your system preference.

## Deploy on Vercel

The included `vercel.json` rewrites the domain root (`/`) to `memory-allocation-simulation.html`, so the deployed site opens the simulator without requiring an `index.html` or renaming the page. In Vercel, use the folder containing `vercel.json` as the project root and choose the **Other** framework preset with no build command. Commit and push changes, then wait for the new deployment to finish.

### Try the interactive demo

Select **Load fragmentation demo** in the setup panel to create a fragmented 1,000-byte memory layout. The allocation form is pre-filled with a 150-byte request. Change the fit strategy or requested size to preview the target region in both the map and table before allocating. A request that cannot fit also reports total free bytes and the largest available region.

## Allocation strategies

- **First fit** scans from the beginning and uses the first region large enough.
- **Next fit** continues scanning from the position after the previous next-fit allocation.
- **Best fit** chooses the smallest region that can satisfy the request.
- **Worst fit** chooses the largest region that can satisfy the request.

When a region is larger than the request, it is split into an allocated region and a remaining free region. This simulator does not compact memory; free regions merge only when they become adjacent.

## Understanding the display

- **Memory map:** Each segment is proportional to the region's size. Green is free; colored segments are process allocations. The orange marker shows the next-fit search position.
- **Memory blocks:** Lists each region's start and inclusive end address, size, status, and owning process. Addresses start at zero.
- **Largest free block:** The largest single region that can currently satisfy a request.
- **External fragmentation:** `100 × (1 − largest free block / total free memory)`. It is 0% when all free memory is in one region, and grows as free memory becomes distributed among smaller regions. It is 0% when no memory is free.

## Why memory allocation matters in an operating system

An operating system must give processes memory while keeping track of which address ranges are in use and which are available. Allocation policy influences how quickly a request can be served and how much contiguous space remains for later requests. A system can have enough free memory in total yet still be unable to satisfy a large request if that memory is split into smaller, non-adjacent regions. This is external fragmentation.

Trying different strategies and allocation/release sequences makes these trade-offs visible. The same ideas help explain memory managers, partitioning, placement policies, and why some systems use techniques such as paging or compaction.

## Scope and limitations

This is an educational model, not an operating-system memory manager. It simulates a single contiguous address space with whole-byte requests and one region per process. It does not represent virtual memory, page tables, physical RAM, process isolation, permissions, allocator metadata, alignment, or the behavior/performance of any real OS. The displayed capacity is only the value entered into the simulator; it is not read from the computer.
