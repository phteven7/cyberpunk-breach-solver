# Cyberpunk 2077 Breach Protocol Solver

A fast, browser-based solver for the Breach Protocol hacking minigame in Cyberpunk 2077.

![Screenshot](https://img.shields.io/badge/status-working-brightgreen)

## Features

- Supports 5x5, 6x6, and 7x7 matrices
- Quick single-character input (1=1C, 5=55, 7=7A, B=BD, E=E9, F=FF)
- Visual path overlay with step numbers
- Finds optimal paths that complete all target sequences
- Handles sequence chaining/overlapping for maximum efficiency
- Zero dependencies - runs entirely in browser

## Usage

1. Open `index.html` in any modern browser
2. Select your grid size (5x5, 6x6, or 7x7)
3. Enter the code matrix (type single characters, auto-advances)
4. Enter target sequences (one per line, space-separated)
5. Set your buffer size
6. Click **SOLVE**

### Input Shortcuts

| Type | Gets |
|------|------|
| `1`  | 1C   |
| `5`  | 55   |
| `7`  | 7A   |
| `B`  | BD   |
| `E`  | E9   |
| `F`  | FF   |

## How It Works

The solver uses a DFS (Depth-First Search) algorithm that:

1. **Generates target buffers** - Finds all ways to chain/merge sequences with overlap
2. **Finds valid paths** - Searches the matrix for paths that produce the target buffer
3. **Handles fillers** - Can use "throwaway" moves to navigate to needed cells
4. **Respects game rules** - Alternates between row/column selection, no cell reuse

### Sequence Matching

Sequences must appear **consecutively** in the buffer (game rules), but can **overlap** at boundaries:

```
Sequences: [1C, 7A, 55] and [55, 7A, BD]
Merged:    [1C, 7A, 55, 7A, BD]  (sharing the 55)
```

## Project Structure

```
cyberpunkHack/
├── index.html      # Main HTML file
├── css/
│   └── styles.css  # Cyberpunk-themed styles
├── js/
│   └── solver.js   # Solver algorithm + UI logic
├── README.md
├── LICENSE
└── .gitignore
```

## Local Development

No build process needed. Just open `index.html` in a browser.

For development with live reload:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

## License

MIT License - see [LICENSE](LICENSE)

## Credits

Built for solving the Breach Protocol minigame in Cyberpunk 2077 by CD Projekt Red.
