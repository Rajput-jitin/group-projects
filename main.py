import sys
import os
import importlib.util
from pathlib import Path

# Change working directory to schemeseva-backend so data and database paths resolve cleanly
backend_dir = Path(__file__).resolve().parent / "schemeseva-backend"
os.chdir(backend_dir)
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

backend_main_path = backend_dir / "main.py"
spec = importlib.util.spec_from_file_location("backend_main_module", backend_main_path)
backend_mod = importlib.util.module_from_spec(spec)
sys.modules["backend_main_module"] = backend_mod
spec.loader.exec_module(backend_mod)

app = backend_mod.app
