# SFX Manager v0.1a

A minimalist sound effects manager extension for Adobe Premiere Pro.

## Features

- **Visual Waveform Preview:** Integrated real-time waveform rendering for precise audio selection.
- **Intelligent Metadata Engine:** Advanced tagging system with a dedicated search syntax (`tag:"..."`, `only:"..."`, `exp:"..."`).
- **Smart Sequence Synchronization:** Track exactly where and when an audio clip is used across all active sequences.
- **One-Click Navigation:** Jump the Playhead directly to specific clip timestamps.
- **Optimized Performance:** Clean, native-looking B&W interface with lazy loading for large libraries.

## Installation

1. Download the latest `.zxp` release.
2. Install using [Anastasiy's Extension Manager](https://install.anastasiy.com/) (Recommended) or ZXP Installer.
3. Restart Premiere Pro.
4. Go to **Window > Extensions > SFX Manager v0.1a**.

## Development

To build the ZXP package yourself:

1. Clone the repo and run `npm install` to get dependencies (like wavesurfer.js).
2. Remove `.debug` file if present.
3. Package using `ZXPSignCmd`.

## License

- This project is licensed under the GNU GPLv3.
- You are free to contribute, modify, and share the source code.
- STRICTLY PROHIBITED: You are not allowed to use the code to package it into a paid commercial product without the author’s permission (Tran Hai Dang/Moonlightspeed/PenguinT).
- Any modifications derived from this project must also be released as open source.
