.PHONY: help build up down logs shell test lint format clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker commands
build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-db: ## Show database logs
	docker-compose logs -f postgres

# Development commands
dev: ## Start services in development mode
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

shell: ## Open shell in backend container
	docker-compose exec backend bash

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d musictracker

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

# Backend commands
migrate: ## Run database migrations
	docker-compose exec backend alembic upgrade head

makemigrations: ## Create new migration
	docker-compose exec backend alembic revision --autogenerate -m "$(msg)"

test: ## Run backend tests
	docker-compose exec backend pytest

test-cov: ## Run tests with coverage
	docker-compose exec backend pytest --cov=app tests/

lint: ## Run linting
	docker-compose exec backend black app tests
	docker-compose exec backend isort app tests
	docker-compose exec backend flake8 app tests
	docker-compose exec backend mypy app

format: ## Format code
	docker-compose exec backend black app tests
	docker-compose exec backend isort app tests

# Mobile commands
mobile-ios: ## Start iOS simulator
	cd mobile-app && npm run ios

mobile-android: ## Start Android emulator
	cd mobile-app && npm run android

mobile-web: ## Start web version
	cd mobile-app && npm run web

mobile-install: ## Install mobile dependencies
	cd mobile-app && npm install

# Cleanup
clean: ## Clean up containers and volumes
	docker-compose down -v
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

reset: ## Reset everything (WARNING: destroys data)
	docker-compose down -v
	docker system prune -af
	rm -rf backend/venv
	rm -rf mobile-app/node_modules