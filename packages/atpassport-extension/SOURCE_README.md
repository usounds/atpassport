# Build Instructions for @passport Extension Source Code

This document provides instructions on how to build the @passport browser extension from the provided source code.

## Operating System and Build Environment
- **Operating System**: macOS, Linux, or Windows
- **Node.js**: Version 18.0.0 or later
- **Package Manager**: pnpm (version 8 or later recommended)

## Installation and Requirements
1. **Node.js**: Download and install from [nodejs.org](https://nodejs.org/).
2. **pnpm**: Install globally via npm:
   ```bash
   npm install -g pnpm
   ```

## Build Process
To create an exact copy of the add-on code, follow these steps:

1. **Extract the source code**:
   Unzip the `atpassport-extension-source.zip` file into a directory.

2. **Install dependencies**:
   Navigate to the directory and run:
   ```bash
   pnpm install
   ```

3. **Build the extension for Firefox**:
   Run the following command:
   ```bash
   pnpm run build:firefox
   ```

4. **Locate the output**:
   After the build completes, the formatted and bundled extension files will be in the `dist` directory. A ZIP file named `atpassport-extension-firefox.zip` will also be created in the root of the source directory.

## Source Code Integrity
All source files are located in the `src` and `public` directories. No machine-generated or minified files (other than standard open-source third-party libraries managed by pnpm) are included in these directories.
