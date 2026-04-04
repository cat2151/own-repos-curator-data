#!/usr/bin/env python3
"""Build script for the static site.

Called by the GitHub Actions workflow to install dependencies and
build dist/ with Vite.
"""

import subprocess
import sys
import os


def run(cmd: list[str], **kwargs) -> None:
    """Run a command, raising on failure."""
    print(f"$ {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True, **kwargs)


def install_deps() -> None:
    run(["npm", "ci"])


def build() -> None:
    run(["npm", "run", "build"])


def main() -> None:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(repo_root)
    print(f"Working directory: {os.getcwd()}", flush=True)

    install_deps()
    build()
    print("Build complete!", flush=True)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}", file=sys.stderr)
        sys.exit(1)
