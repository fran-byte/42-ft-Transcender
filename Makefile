# --- COLORS ---
GREEN  := \033[0;32m
RED    := \033[0;31m
YELLOW := \033[1;33m
BLUE   := \033[0;34m
CYAN   := \033[0;36m
RESET  := \033[0m

# --- VARIABLES ---
COMPOSE     := docker compose
NAME    := transcendence
CERT_DIR := ./secrets/certs
CERT_KEY := $(CERT_DIR)/blackjack.local.key
CERT_CRT := $(CERT_DIR)/blackjack.local.crt
ENV_FILE := .env
DATA_DIR := ./data/postgres
NGINX_CONF := ./requirements/nginx/conf.d/blackjack.conf

# --- PRIMARY TARGETS ---

# 'make' or 'make all': full setup + start
all: setup up

# Start containers in production mode
up:
	@echo "$(GREEN)Building and starting production containers...$(RESET)"
	$(COMPOSE) down --remove-orphans
	@docker rm -f blackjack-backend blackjack-frontend blackjack-nginx \
		blackjack-db blackjack-prometheus blackjack-grafana \
		blackjack-cadvisor 2>/dev/null || true
	$(COMPOSE) up -d --build
	@echo "$(GREEN)✓ Production ready!$(RESET)"
	@echo "      https://blackjack.local"
	@echo "$(YELLOW)If you haven't added the hosts entry, run: sudo make hosts$(RESET)"

# 'make logs': view logs
logs:
	@echo "$(GREEN)Showing logs (Ctrl+C to exit)...$(RESET)"
	$(COMPOSE) logs -f

# 'make stop': stop containers
stop:
	@echo "$(RED)Stopping containers...$(RESET)"
	$(COMPOSE) stop

# 'make down': remove containers and networks (keep volumes)
down:
	@echo "$(RED)Removing containers and networks...$(RESET)"
	$(COMPOSE) down --remove-orphans

# 'make restart': restart all services
restart: down up

# 'make fclean': full cleanup (containers, images, volumes)
fclean:
	@echo "$(RED)NUKING EVERYTHING (Containers, Networks, Images, Volumes)...$(RESET)"
	$(COMPOSE) down -v --rmi all --remove-orphans
	@echo "$(RED)Removing local database files...$(RESET)"
	@sudo rm -rf $(DATA_DIR)
	@sudo mkdir -p $(DATA_DIR)
	@sudo chown -R $$(id -u):$$(id -g) ./data
	@echo "$(GREEN)✓ System completely reset.$(RESET)"

# 'make re': fclean + up
re: fclean up

# 'make ps': show container status
ps:
	$(COMPOSE) ps

# 'make health': check service health
health:
	@echo "$(CYAN)Checking service health...$(RESET)"
	@curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:3000/health || echo "Backend: DOWN"
	@curl -s -o /dev/null -w "Frontend: %{http_code}\n" https://localhost --insecure || echo "Frontend: DOWN"
	@docker ps --filter "name=blackjack" --format "table {{.Names}}\t{{.Status}}"

# --- SETUP TARGETS ---

# 'make setup': prepare everything
setup: ensure-certs ensure-env ensure-hosts ensure-nginx ensure-data
	@echo "$(GREEN)✓ Setup complete.$(RESET)"

# Generate self-signed certificate if missing
ensure-certs:
	@mkdir -p $(CERT_DIR)
	@if [ ! -f $(CERT_CRT) ]; then \
		echo "$(YELLOW)Generating self-signed SSL certificate...$(RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(CERT_KEY) \
			-out $(CERT_CRT) \
			-subj "/C=ES/ST=Madrid/L=Madrid/O=Blackjack/OU=Prod/CN=blackjack.local" \
			-addext "subjectAltName=DNS:blackjack.local,DNS:www.blackjack.local,DNS:localhost" \
			2>/dev/null; \
		chmod 600 $(CERT_KEY); \
		chmod 644 $(CERT_CRT); \
		echo "$(GREEN)✓ Certificates generated in $(CERT_DIR)$(RESET)"; \
	else \
		echo "$(BLUE)SSL certificates already exist.$(RESET)"; \
	fi

# Create .env for production
ensure-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Creating .env file for PRODUCTION...$(RESET)"; \
		DB_PASS=$$(openssl rand -hex 12); \
		JWT_SECRET=$$(openssl rand -hex 32); \
		echo ""; \
		echo "$(CYAN)=== Grafana Configuration ===$(RESET)"; \
		echo -n "$(CYAN)Enter Grafana username (default: admin): $(RESET)"; \
		read GRAFANA_USER; \
		echo -n "$(CYAN)Enter Grafana password (default: admin): $(RESET)"; \
		read GRAFANA_PASS; \
		echo ""; \
		if [ -z "$$GRAFANA_USER" ]; then \
			GRAFANA_USER="admin"; \
		fi; \
		if [ -z "$$GRAFANA_PASS" ]; then \
			GRAFANA_PASS="admin"; \
			echo "$(YELLOW)No password entered, using default: admin$(RESET)"; \
		fi; \
		printf 'POSTGRES_USER=blackjack_user\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=blackjack_db\nDB_HOST=db\nJWT_SECRET=%s\nDATA_PATH=./data\nNODE_ENV=production\nREACT_APP_API_URL=https://blackjack.local/api\nGRAFANA_USER=%s\nGRAFANA_PASSWORD=%s\n' "$$DB_PASS" "$$JWT_SECRET" "$$GRAFANA_USER" "$$GRAFANA_PASS" > $(ENV_FILE); \
		echo "$(GREEN)✓ .env file created for PRODUCTION.$(RESET)"; \
		echo "$(YELLOW)=== GRAFANA CREDENTIALS ===$(RESET)"; \
		echo "  Usuario: $$GRAFANA_USER"; \
		echo "  Password: $$GRAFANA_PASS"; \
		echo "  URL: http://localhost:3001"; \
		echo "$(YELLOW)===========================$(RESET)"; \
	else \
		echo "$(BLUE).env file already exists.$(RESET)"; \
	fi

# Add blackjack.local to /etc/hosts
hosts:
	@if ! grep -q "blackjack.local" /etc/hosts 2>/dev/null; then \
		echo "127.0.0.1 blackjack.local www.blackjack.local" | sudo tee -a /etc/hosts > /dev/null; \
		echo "$(GREEN)✓ Entry added to /etc/hosts$(RESET)"; \
	else \
		echo "$(BLUE)Entry already exists.$(RESET)"; \
	fi

# Ensure nginx configuration exists
ensure-nginx:
	@mkdir -p ./requirements/nginx/conf.d
	@if [ ! -f $(NGINX_CONF) ]; then \
		echo "$(RED)❌ Configuration file not found: $(NGINX_CONF)$(RESET)"; \
		exit 1; \
	else \
		echo "$(BLUE)Nginx configuration OK.$(RESET)"; \
	fi

# Create data directory
ensure-data:
	@sudo mkdir -p $(DATA_DIR)
	@sudo chown -R $$(id -u):$$(id -g) ./data

# --- ML TRAINING ---

# Image and paths for the DQN training pipeline
ML_TRAIN_IMAGE := blackjack-ml-train
ML_TRAIN_DIR   := $(PWD)/ml_service/train

# 'make train': rebuild the training container and train the DQN from scratch.
# The trained model lands at ml_service/train/blackjack_dqn.npz on the host
# (volume-mounted), which the inference service picks up automatically.
# Uses GPU (CUDA) if available, falls back to CPU otherwise.
train:
	@echo "$(GREEN)Building ML training image ($(ML_TRAIN_IMAGE))...$(RESET)"
	@docker build -f ./ml_service/Dockerfile.train -t $(ML_TRAIN_IMAGE) ./ml_service
	@echo "$(GREEN)Starting training run...$(RESET)"
	@if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then \
		echo "$(CYAN)GPU detected — training with --gpus all$(RESET)"; \
		docker run --rm --gpus all \
			-v $(ML_TRAIN_DIR):/work/train \
			$(ML_TRAIN_IMAGE); \
	else \
		echo "$(YELLOW)No GPU detected — falling back to CPU (much slower)$(RESET)"; \
		docker run --rm \
			-v $(ML_TRAIN_DIR):/work/train \
			$(ML_TRAIN_IMAGE); \
	fi
	@echo "$(GREEN)✓ Training finished. Model exported to $(ML_TRAIN_DIR)/blackjack_dqn.npz$(RESET)"

# 'make evaluate': run the offline evaluation harness inside the training image.
# Compares the trained DQN against basic strategy and random over N hands.
evaluate:
	@if [ ! -f $(ML_TRAIN_DIR)/blackjack_dqn.npz ]; then \
		echo "$(RED)❌ No trained model found at $(ML_TRAIN_DIR)/blackjack_dqn.npz$(RESET)"; \
		echo "$(YELLOW)Run 'make train' first.$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Evaluating model against basic strategy and random...$(RESET)"
	@docker run --rm \
		-v $(ML_TRAIN_DIR):/work/train \
		--entrypoint python \
		$(ML_TRAIN_IMAGE) evaluate.py --hands 50000

# --- UTILITY TARGETS ---

# Show service info
info:
	@echo "$(CYAN)============================================================$(RESET)"
	@echo "$(CYAN)           BLACKJACK - Production Environment              $(RESET)"
	@echo "$(CYAN)============================================================$(RESET)"
	@echo ""
	@echo "$(GREEN)Main Commands:$(RESET)"
	@echo "  make              Full setup + start"
	@echo "  make up           Start all services"
	@echo "  make down         Stop and remove containers"
	@echo "  make restart      Restart all services"
	@echo "  make logs         View live logs"
	@echo "  make ps           Show container status"
	@echo "  make health       Check service health"
	@echo "  make re           Full reset and rebuild"
	@echo "  make fclean       Complete cleanup"
	@echo ""
	@echo "$(GREEN)ML Training:$(RESET)"
	@echo "  make train        Train the DQN model (GPU if available)"
	@echo "  make evaluate     Compare DQN vs basic strategy vs random"
	@echo ""
	@echo "$(GREEN)Access Points:$(RESET)"
	@echo "  Main App:    https://blackjack.local"
	@echo "  Grafana:     http://localhost:3001"
	@echo "  Prometheus:  http://localhost:9090"
	@echo "  cAdvisor:    http://localhost:8080"
	@echo ""

.PHONY: all up logs stop down restart fclean re ps health setup \
        ensure-certs ensure-env ensure-hosts ensure-nginx ensure-data \
        hosts info train train-run evaluate