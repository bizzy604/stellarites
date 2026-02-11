# Repo root Makefile: delegate to Backend/Frontend
.PHONY: backend-lint backend-test backend-format frontend-lint frontend-build ci

backend-lint:
	$(MAKE) -C Backend lint

backend-test:
	$(MAKE) -C Backend test

backend-format:
	$(MAKE) -C Backend format

frontend-lint:
	cd Frontend && npm run lint

frontend-build:
	cd Frontend && npm run build

ci: backend-lint backend-test frontend-lint frontend-build
