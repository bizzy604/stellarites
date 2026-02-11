# Backend Makefile (run from Backend/ or repo root with make -C Backend)
.PHONY: up down test lint format install-dev

up:
	docker compose up --build

down:
	docker compose down

install-dev:
	pip install -r requirements.txt && pip install -r requirements-dev.txt

test:
	pytest -v

lint:
	ruff check app tests && ruff format --check app tests

format:
	ruff check app tests --fix && ruff format app tests
