#!/usr/bin/env python3
"""
VaniSPR Research Suite - All-In-One Unified Launcher
Starts both the FastAPI backend and Vite frontend, then opens the browser.
Works on Linux, macOS, and Windows.
"""
import os
import sys
import time
import subprocess
import webbrowser
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Determine Python executable
if os.path.exists(os.path.join(ROOT_DIR, ".venv", "bin", "python")):
    PYTHON_EXE = os.path.join(ROOT_DIR, ".venv", "bin", "python")
elif os.path.exists(os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")):
    PYTHON_EXE = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
else:
    PYTHON_EXE = sys.executable

def main():
    print("=" * 64)
    print("   VaniSPR · Psycholinguistic Self-Paced Reading Suite")
    print("=" * 64)
    print("⚡ Starting backend and frontend services...")

    processes = []

    try:
        # 1. Start Backend
        print("▶ Starting FastAPI Backend (http://127.0.0.1:8000)...")
        backend_proc = subprocess.Popen(
            [PYTHON_EXE, os.path.join(BACKEND_DIR, "run.py")],
            cwd=BACKEND_DIR
        )
        processes.append(backend_proc)

        # 2. Start Frontend
        print("▶ Starting Vite Frontend (http://localhost:5173)...")
        # On Windows use shell=True for npm
        use_shell = (sys.platform == "win32")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=FRONTEND_DIR,
            shell=use_shell
        )
        processes.append(frontend_proc)

        # Allow servers 2 seconds to initialize
        time.sleep(2)

        print("\n" + "=" * 64)
        print("  🎉 VaniSPR is ready!")
        print("  🌐 Researcher Console:   http://localhost:5173")
        print("  📖 Interactive API Docs: http://127.0.0.1:8000/docs")
        print("=" * 64)
        print("\nOpening your web browser...")
        try:
            webbrowser.open("http://localhost:5173")
        except Exception:
            pass

        print("\n[Press CTRL + C at any time to stop both servers]\n")

        # Keep parent alive and monitor child processes
        while True:
            time.sleep(1)
            for p in processes:
                if p.poll() is not None:
                    print(f"Service exited with code {p.returncode}")
                    return

    except KeyboardInterrupt:
        print("\n🛑 Shutting down VaniSPR services...")
    finally:
        for p in processes:
            try:
                if sys.platform == "win32":
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(p.pid)])
                else:
                    os.kill(p.pid, signal.SIGTERM)
            except Exception:
                pass
        print("Done. Goodbye!")

if __name__ == "__main__":
    main()
