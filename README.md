# SFX Manager v0.0.1

A minimalist, high-performance sound effects manager extension for Adobe Premiere Pro.

## Features

- **Visual Waveform Preview:** Powered by **Wavesurfer.js** for real-time audio visualization.
- **Advanced Search Syntax:** Find sounds instantly using dedicated filters (`tag:`, `only:`, `exp:`).
- **Smart Sequence Sync:** Automatically track usage across all active sequences.
- **Navigation:** One-click playhead jump to any clip instance on the timeline.
- **In-App Management:** Rename files directly on disk without losing metadata.

## Installation (For Users)

1. Download the latest `Sound_Manager.zxp` from the [Releases](https://github.com/moonlightspeed/Sound-Manager-Premiere-Extension/releases) page.
2. Install it using [Anastasiy's Extension Manager](https://install.anastasiy.com/) (Recommended) or any zxp installer you think it may work :))
3. Open Premiere Pro and go to **Window > Extensions > SFX Manager v0.1a**.

## Development & Building (For Developers)

### 1. Prerequisites

- **Node.js** (to manage dependencies)
- **ZXPSignCmd** (Adobe's tool to package the extension)

### 2. Setup

Clone the repository and install **Wavesurfer.js** (required for the waveform display):

```bash
git clone https://github.com/moonlightspeed/Sound-Manager-Premiere-Extension.git
cd Sound-Manager-Premiere-Extension
npm install
```

Note: This will create the node_modules/ folder which contains the necessary Wavesurfer files referenced in index.html

# 3. Creating a Self-Signed Certificate

If you don't have a .p12 certificate yet, create one:

```bash
ZXPSignCmd -selfSignedCert yourcountry yourcity "YourName" "YourPassword" cert.p12
```

# 4. Building the ZXP Package

IMPORTANT: Since node_modules is ignored by Git, you must ensure the specific wavesurfer.min.js file is included in your Deploy folder before signing.

```bash
# Create a clean deployment folder
mkdir Deploy
xcopy . Deploy /E /H /C /I /Y /EXCLUDE:exclude_list.txt

# Manually copy Wavesurfer to Deploy folder (if not using a bundler)
mkdir Deploy\node_modules\wavesurfer.js\dist\
copy node_modules\wavesurfer.js\dist\wavesurfer.min.js Deploy\node_modules\wavesurfer.js\dist\

# Sign and Package
ZXPSignCmd -sign ./Deploy Sound_Manager.zxp cert.p12 "YourPassword" -tsa [http://timestamp.digicert.com](http://timestamp.digicert.com)
```

# 6. Search Syntax Guide

- Use these prefixes in the search bar for better results:
- tag:"wind, rain" : Finds files that have these specific tags.
- only:"whoosh" : Finds files where the name or tag is EXACTLY "whoosh".
- exp:"metal" : Excludes any files containing the word "metal".

# License

This project is licensed under the GNU GPLv3. See the LICENSE file for details.
