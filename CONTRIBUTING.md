# Contributing to NannyChain (Stellarites)

Thanks for contributing. This doc keeps the team aligned as the codebase grows.

## Branching

- **main** — production-ready; protect it and require PRs.
- **dev** (optional) — integration branch for features.
- **Feature branches** — e.g. `feature/worker-registration`, `fix/ussd-session`, `chore/ci-setup`. Branch from `main` (or `dev` if you use it).

## Before you commit

### Backend (Python)

From the `Backend/` directory:

```bash
cd Backend
pip install -r requirements-dev.txt   # adds ruff, pre-commit
ruff check app tests && ruff format app tests   # lint + format
pytest
```

Or use the repo Makefile from repo root:

```bash
make backend-lint
make backend-test
```

### Frontend

From the `Frontend/` directory:

```bash
cd Frontend
npm ci
npm run lint
npm run build
```

### Pre-commit (optional but recommended)

From the repo root, once per clone:

```bash
pip install pre-commit   # or use Backend venv
pre-commit install
```

Then every `git commit` will run Ruff on Backend and ESLint on Frontend (only on changed files). To run on all files: `pre-commit run --all-files`.

## Pull requests

1. Create a branch from `main` (or `dev`).
2. Make changes; keep commits logical and messages clear.
3. Run lint and tests locally (see above).
4. Push and open a PR. CI will run:
   - **Backend:** Ruff (lint + format check), Pytest.
   - **Frontend:** ESLint, `npm run build`.
5. Address review feedback. Merge when CI is green and approved.

## Code style

- **Backend:** Ruff (format + lint). Config in `Backend/pyproject.toml`. Line length 100.
- **Frontend:** ESLint; follow existing style in the project.

## Where things live

- **Backend:** `Backend/README.md` and `Backend/docs/architecture.md` describe the API, USSD, Stellar, and DB.
- **Product:** Root `README.md` is the product/PRD overview.

## Questions

Open an issue or ask in team chat. Keep architecture and API decisions documented in `Backend/docs/` and the READMEs.
