import importlib
import traceback
import sys
from pathlib import Path


def main():
    # ensure project root is on sys.path when running the script directly
    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root))

    try:
        importlib.import_module('app.routes.payments')
        print('IMPORTED')
    except Exception:
        traceback.print_exc()
        print('IMPORT_FAILED')


if __name__ == '__main__':
    main()
