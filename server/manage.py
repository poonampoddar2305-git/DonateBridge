#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        venv_python_win = os.path.join(base_dir, '.venv', 'Scripts', 'python.exe')
        venv_python_unix = os.path.join(base_dir, '.venv', 'bin', 'python')
        target_python = venv_python_win if os.path.exists(venv_python_win) else (venv_python_unix if os.path.exists(venv_python_unix) else None)
        if target_python and os.path.abspath(sys.executable).lower() != os.path.abspath(target_python).lower():
            import subprocess
            res = subprocess.run([target_python] + sys.argv)
            sys.exit(res.returncode)
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
