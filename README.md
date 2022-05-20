Simple action which installs Lazarus and FPC from sourceforge releases.

## Example usage

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
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus%20Windows%2064%20bits/Lazarus%202.0.12/lazarus-2.0.12-fpc-3.2.0-win64.exe
            
          - os: windows-latest
            name: Windows 32
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus%20Windows%2032%20bits/Lazarus%202.0.12/lazarus-2.0.12-fpc-3.2.0-win32.exe
            
          - os: ubuntu-latest
            name: Linux 64
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus%20Linux%20amd64%20DEB/Lazarus%202.0.12/lazarus-project_2.0.12-0_amd64.deb
            fpc-url: |
              https://sourceforge.net/projects/lazarus/files/Lazarus%20Linux%20amd64%20DEB/Lazarus%202.0.12/fpc-laz_3.2.0-1_amd64.deb
              https://sourceforge.net/projects/lazarus/files/Lazarus%20Linux%20amd64%20DEB/Lazarus%202.0.12/fpc-src_3.2.0-1_amd64.deb
              
          - os: macos-latest
            name: MacOS 64
            laz-url: https://sourceforge.net/projects/lazarus/files/Lazarus%20macOS%20x86-64/Lazarus%202.0.12/Lazarus-2.0.12-x86_64-macosx.pkg
            fpc-url: |
              https://sourceforge.net/projects/lazarus/files/Lazarus%20macOS%20x86-64/Lazarus%202.0.12/fpc-3.2.0.intel-macosx.dmg
              https://sourceforge.net/projects/lazarus/files/Lazarus%20macOS%20x86-64/Lazarus%202.0.12/fpc-src-3.2.0-2-laz.pkg      
        
    steps:
      - uses: actions/checkout@v3.0.2
      
      - name: Install Lazarus
        uses: ollydev/setup-lazarus@v2
        with:
          laz-url: ${{ matrix.config.laz-url }}
          fpc-url: ${{ matrix.config.fpc-url }}
      
      - name: Test Installation
        run: |
          lazbuild --version
```
