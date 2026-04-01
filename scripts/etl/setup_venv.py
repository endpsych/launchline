"""
EndFlow — venv setup script.

Creates etl/.venv and installs requirements.txt if not already done.
Run with any Python 3.8+ interpreter.

Usage:
  python setup_venv.py [etl_dir]
"""

import sys
import os
import subprocess
import venv

def run_checked(args, *, label):
    try:
        subprocess.run(args, check=True)
        return True
    except subprocess.CalledProcessError as exc:
        print(f'[setup] {label} failed with exit code {exc.returncode}.', flush=True)
        return False

def remove_file_if_exists(target):
    try:
        if os.path.exists(target):
            os.remove(target)
    except OSError:
        pass

def main():
    etl_dir  = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    venv_dir = os.path.join(etl_dir, '.venv')
    req_file = os.path.join(etl_dir, 'requirements.txt')

    # Determine venv Python path (cross-platform)
    if sys.platform == 'win32':
        venv_python = os.path.join(venv_dir, 'Scripts', 'python.exe')
        venv_pip    = os.path.join(venv_dir, 'Scripts', 'pip.exe')
    else:
        venv_python = os.path.join(venv_dir, 'bin', 'python')
        venv_pip    = os.path.join(venv_dir, 'bin', 'pip')

    # Create venv if it doesn't exist
    if not os.path.exists(venv_python):
        print(f'[setup] Creating venv at {venv_dir}...', flush=True)
        venv.create(venv_dir, with_pip=True, clear=False)
        print('[setup] venv created.', flush=True)
    else:
        print(f'[setup] venv already exists at {venv_dir}.', flush=True)

    def ensure_pip_ready():
        print('[setup] Ensuring pip is available in the environment...', flush=True)
        ensurepip_ok = run_checked(
            [venv_python, '-m', 'ensurepip', '--upgrade'],
            label='ensurepip bootstrap',
        )
        if not ensurepip_ok:
            return False
        print('[setup] Upgrading pip...', flush=True)
        return run_checked(
            [venv_python, '-m', 'pip', 'install', '--upgrade', 'pip', '--quiet'],
            label='pip upgrade',
        )

    if not os.path.exists(venv_pip):
        print('[setup] pip is missing from the existing environment. Attempting repair...', flush=True)
        if not ensure_pip_ready():
            print('[setup] Repair failed. Recreating the virtual environment...', flush=True)
            venv.create(venv_dir, with_pip=True, clear=True)
            print('[setup] venv recreated.', flush=True)
            if not ensure_pip_ready():
                raise RuntimeError('Unable to repair pip inside the virtual environment.')

    # Check if sentinel matches current requirements hash
    import hashlib
    sentinel    = os.path.join(venv_dir, '.deps_installed')
    req_hash    = hashlib.md5(open(req_file,'rb').read()).hexdigest()
    if os.path.exists(sentinel) and open(sentinel).read().strip() == req_hash:
        print('[setup] Dependencies already installed. Done.', flush=True)
        print(f'VENV_PYTHON={venv_python}', flush=True)
        return

    if not ensure_pip_ready():
        remove_file_if_exists(sentinel)
        raise RuntimeError('Unable to prepare pip inside the virtual environment.')

    # Install requirements
    print('[setup] Installing requirements (this may take a minute)...', flush=True)
    subprocess.run(
        [venv_pip, 'install', '-r', req_file, '--quiet'],
        check=True,
    )

    # Write sentinel with requirements hash so we reinstall if requirements change
    with open(sentinel, 'w') as f:
        f.write(req_hash)

    print('[setup] Dependencies installed successfully.', flush=True)
    print(f'VENV_PYTHON={venv_python}', flush=True)

if __name__ == '__main__':
    main()
