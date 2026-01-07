[![Test](https://github.com/ollydev/setup-lazarus/actions/workflows/test.yml/badge.svg)](https://github.com/ollydev/setup-lazarus/actions/workflows/test.yml)

Github action which can install Lazarus (and FPC) from sourceforge releases or build using fpclazup.

----
**Example using Lazarus SourceForge releases:**
```yml
on: [push, pull_request]
jobs:
  test:
    name: ${{ matrix.config.name }}
    runs-on: ${{ matrix.config.os }}
    defaults:
      run:
        shell: bash
    strategy:
      fail-fast: false
      matrix:
        config:
          - os: windows-latest
            name: Windows 64
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus Windows 64 bits/Lazarus 4.2/lazarus-4.2-fpc-3.2.2-win64.exe
            
          - os: windows-latest
            name: Windows 32
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus Windows 32 bits/Lazarus 4.2/lazarus-4.2-fpc-3.2.2-win32.exe

          - os: ubuntu-latest
            name: Linux 64
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus Linux amd64 DEB/Lazarus 4.2/lazarus-project_4.2.0-0_amd64.deb
            fpc-url: |
              https://sourceforge.net/projects/lazarus/files/Lazarus Linux amd64 DEB/Lazarus 4.2/fpc-laz_3.2.2-210709_amd64.deb
              https://sourceforge.net/projects/lazarus/files/Lazarus Linux amd64 DEB/Lazarus 4.2/fpc-src_3.2.2-210709_amd64.deb
            
          - os: macos-latest
            name: MacOS 64
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus macOS x86-64/Lazarus 4.2/lazarus-darwin-x86_64-4.2.zip
            fpc-url: https://sourceforge.net/projects/lazarus/files/Lazarus macOS x86-64/Lazarus 4.2/fpc-3.2.2.intelarm64-macosx.dmg
        
    steps:
      - name: Install Lazarus
        uses: ollydev/setup-lazarus@v4
        with:
          laz-url: ${{ matrix.config.laz-url }}
          fpc-url: ${{ matrix.config.fpc-url }}
      
      - name: Test Installation
        run: |
          lazbuild --version
```
----
**Example using fpclazup to build Lazarus and FPC:**
```yml
on: [push, pull_request]
jobs:
  test:
    name: ${{ matrix.config.name }}
    runs-on: ${{ matrix.config.os }}
    defaults:
      run:
        shell: bash
    strategy:
      fail-fast: false
      matrix:
        config:
          - os: windows-latest
            name: Windows 64
            args: ""
            fpclazup-url: https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.4.0g/fpclazup-x86_64-win64.exe
            fpclazup-lazcommit: 98f9c7a7a102139e43b39050ebbb5c48d805f59f # 4.4
            fpclazup-fpccommit: de30ac10d4f228c5d4915c49d48715063ea55787 # trunk (~3.3)

          - os: windows-latest
            name: Windows 32
            args: "--cpu=i386"
            fpclazup-url: https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.4.0g/fpclazup-x86_64-win64.exe
            fpclazup-lazcommit: 98f9c7a7a102139e43b39050ebbb5c48d805f59f # 4.4
            fpclazup-fpccommit: de30ac10d4f228c5d4915c49d48715063ea55787 # trunk (~3.3)

          - os: ubuntu-latest
            name: Linux 64
            args: ""
            fpclazup-url: https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.4.0g/fpclazup-x86_64-linux
            fpclazup-lazcommit: 98f9c7a7a102139e43b39050ebbb5c48d805f59f # 4.4
            fpclazup-fpccommit: de30ac10d4f228c5d4915c49d48715063ea55787 # trunk (~3.3)

          - os: macos-26
            name: MacOS arm64
            args: ""
            fpclazup-url: https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.4.0g/fpclazup-aarch64-darwin
            fpclazup-lazcommit: 98f9c7a7a102139e43b39050ebbb5c48d805f59f # 4.4
            fpclazup-fpccommit: de30ac10d4f228c5d4915c49d48715063ea55787 # trunk (~3.3)
        
    steps:
      - name: Install Lazarus
        uses: ollydev/setup-lazarus@v4
        with:
          fpclazup-url: ${{ matrix.config.fpclazup-url }}
          fpclazup-lazcommit: ${{ matrix.config.fpclazup-lazcommit }}
          fpclazup-fpccommit: ${{ matrix.config.fpclazup-fpccommit }}
      
      - name: Test Installation
        run: |
          lazbuild --version
```

