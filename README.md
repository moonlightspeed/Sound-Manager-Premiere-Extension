# SFX Manager v0.0.1

A minimalist, high-performance sound effects manager extension for Adobe Premiere Pro.

## Features

- **Visual Waveform Preview:** Real-time waveform rendering for precise audio selection.
- **Advanced Search Syntax:** Find sounds instantly using dedicated filters (`tag:`, `only:`, `exp:`).
- **Smart Sequence Sync:** Automatically track usage across all active sequences.
- **Navigation:** One-click playhead jump to any clip instance on the timeline.
- **In-App Management:** Rename files directly on disk without losing metadata.

## Installation (For Users)

1. Download the latest `Sound_Manager.zxp` from the [Releases](https://github.com/moonlightspeed/Sound-Manager-Premiere-Extension/releases) page.
2. Install it using [Anastasiy's Extension Manager](https://install.anastasiy.com/) (Recommended).
3. Open Premiere Pro and go to **Window > Extensions > SFX Manager v0.1a**.

## Development & Building (For Developers)

### 1. Prerequisites

- **Node.js** (to manage dependencies)
- **ZXPSignCmd** (Adobe's tool to package the extension)

### 2. Setup

Clone the repository and install dependencies:

```bash
git clone [https://github.com/moonlightspeed/Sound-Manager-Premiere-Extension.git](https://github.com/moonlightspeed/Sound-Manager-Premiere-Extension.git)
cd Sound-Manager-Premiere-Extension
npm install
```

# 3. Creating a Self-Signed Certificate

If you don't have a .p12 certificate yet, create one:

```bash
ZXPSignCmd -selfSignedCert VN HN "YourName" "YourPassword" cert.p12
```

# 4. Building the ZXP Package

Note: Ensure the .debug file is removed before signing for production.

```bash
# Create a clean deployment folder (exclude .git, node_modules etc.)
mkdir Deploy
xcopy . Deploy /E /H /C /I /Y /EXCLUDE:exclude_list.txt
```

# Sign and Package

ZXPSignCmd -sign ./Deploy Sound_Manager.zxp cert.p12 "YourPassword" -tsa [http://timestamp.digicert.com](http://timestamp.digicert.com)
🔍 Search Syntax Guide

- Use these prefixes in the search bar for better results:
- tag:"wind, rain" : Finds files that have these specific tags.
- only:"whoosh" : Finds files where the name or tag is EXACTLY "whoosh".
- exp:"metal" : Excludes any files containing the word "metal".

# License

- This project is licensed under the GNU GPLv3.
- You are free to contribute, modify, and share the source code.
- STRICTLY PROHIBITED: You are not allowed to use the code to package it into a paid commercial product without the author’s permission (Tran Hai Dang/Moonlightspeed/PenguinT).
- Any modifications derived from this project must also be released as open source.
