# --- COLORS ---
GREEN  := \033[0;32m
RED    := \033[0;31m
YELLOW := \033[1;33m
BLUE   := \033[0;34m
CYAN   := \033[0;36m
RESET  := \033[0m

# --- VARIABLES ---
COMPOSE     := docker compose
COMPOSE_DEV := docker compose -f docker-compose.dev.yml
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

# Start containers (assumes setup already done)
up:
	@echo "$(GREEN)Building and starting containers...$(RESET)"
	$(COMPOSE) down --remove-orphans
	@docker rm -f blackjack-backend blackjack-frontend blackjack-nginx \
		blackjack-db blackjack-prometheus blackjack-grafana \
		blackjack-cadvisor 2>/dev/null || true
	$(COMPOSE) up -d --build
	@echo "$(GREEN)✓ Ready! Access at:$(RESET)"
	@echo "      https://blackjack.local"
	@echo "$(YELLOW)If you haven't added the hosts entry, run: sudo make hosts$(RESET)"

# --- DEV TARGETS (sin Nginx ni monitoring) ---

dev: setup
	@echo "$(GREEN)Starting dev environment (backend:3000 + frontend:5173)...$(RESET)"
	$(COMPOSE_DEV) up -d --build
	@echo "$(GREEN)✓ Dev ready!$(RESET)"
	@echo "  Frontend: https://blackjack.local:5173  (o https://localhost:5173)"
	@echo "  Backend:  http://localhost:3000"

dev-logs:
	$(COMPOSE_DEV) logs -f

dev-down:
	$(COMPOSE_DEV) down --remove-orphans

dev-re:
	$(COMPOSE_DEV) down --remove-orphans
	$(COMPOSE_DEV) up -d --build

# 'make logs': view logs
logs:
	@echo "$(GREEN)Showing logs (Ctrl+C to exit)...$(RESET)"
	$(COMPOSE) logs -f

# 'make stop': stop containers (preserve everything)
stop:
	@echo "$(RED)Stopping containers...$(RESET)"
	$(COMPOSE) stop

# 'make down': remove containers and networks (keep volumes and data)
down:
	@echo "$(RED)Removing containers and networks...$(RESET)"
	$(COMPOSE) down --remove-orphans

# 'make fclean': full cleanup (containers, images, volumes, local DB)
fclean:
	@echo "$(RED)NUKING EVERYTHING (Containers, Networks, Images, Volumes)...$(RESET)"
	$(COMPOSE) down -v --rmi all --remove-orphans
	@echo "$(RED)Removing local database files...$(RESET)"
	@sudo rm -rf $(DATA_DIR)
	@sudo mkdir -p $(DATA_DIR)
	@sudo chown -R $$(id -u):$$(id -g) ./data
	@echo "$(GREEN)✓ System completely reset.$(RESET)"

# 'make re': fclean + up (recreate from scratch)
re: fclean up

# 'make ps': show container status
ps:
	$(COMPOSE) ps

# 'make prune': remove unused Docker objects
prune:
	@echo "$(RED)Pruning unused Docker objects...$(RESET)"
	docker system prune -a -f

# --- SETUP TARGETS ---

# 'make setup': prepare everything (certificates, .env, hosts hint, nginx config)
setup: ensure-certs ensure-env ensure-hosts ensure-nginx
	@echo "$(GREEN)✓ Setup complete.$(RESET)"

# Generate self-signed certificate if missing
ensure-certs:
	@mkdir -p $(CERT_DIR)
	@if [ ! -f $(CERT_CRT) ]; then \
		echo "$(YELLOW)Generating self-signed SSL certificate...$(RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(CERT_KEY) \
			-out $(CERT_CRT) \
			-subj "/C=ES/ST=Madrid/L=Madrid/O=Blackjack/OU=Dev/CN=blackjack.local" \
			-addext "subjectAltName=DNS:blackjack.local,DNS:www.blackjack.local,DNS:localhost" \
			2>/dev/null; \
		chmod 600 $(CERT_KEY); \
		chmod 644 $(CERT_CRT); \
		echo "$(GREEN)✓ Certificates generated in $(CERT_DIR)$(RESET)"; \
	else \
		echo "$(BLUE)SSL certificates already exist.$(RESET)"; \
	fi

# Create .env with random values (interactive for Grafana credentials - password visible)
ensure-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Creating .env file with random credentials...$(RESET)"; \
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
		printf 'POSTGRES_USER=blackjack_user\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=blackjack_db\nDB_HOST=db\nJWT_SECRET=%s\nDATA_PATH=./data\nNODE_ENV=development\nREACT_APP_API_URL=https://blackjack.local/api\nGRAFANA_USER=%s\nGRAFANA_PASSWORD=%s\n' "$$DB_PASS" "$$JWT_SECRET" "$$GRAFANA_USER" "$$GRAFANA_PASS" > $(ENV_FILE); \
		echo "$(GREEN)✓ .env file created.$(RESET)"; \
		echo "$(YELLOW)=== GRAFANA CREDENTIALS ===$(RESET)"; \
		echo "  Usuario: $$GRAFANA_USER"; \
		echo "  Password: $$GRAFANA_PASS"; \
		echo "  URL: http://localhost:3001"; \
		echo "$(YELLOW)===========================$(RESET)"; \
	else \
		echo "$(BLUE).env file already exists.$(RESET)"; \
	fi

# Warn if /etc/hosts is missing the required entry
ensure-hosts:
	@if ! grep -q "blackjack.local" /etc/hosts 2>/dev/null; then \
		echo "$(YELLOW)Missing /etc/hosts entry.$(RESET)"; \
		echo "   Run manually: $(BLUE)sudo make hosts$(RESET)"; \
	else \
		echo "$(BLUE)/etc/hosts entry already present.$(RESET)"; \
	fi

# Add blackjack.local to /etc/hosts (requires sudo)
hosts:
	@if ! grep -q "blackjack.local" /etc/hosts 2>/dev/null; then \
		echo "127.0.0.1 blackjack.local www.blackjack.local" | sudo tee -a /etc/hosts > /dev/null; \
		echo "$(GREEN)✓ Entry added to /etc/hosts$(RESET)"; \
	else \
		echo "$(BLUE)Entry already exists.$(RESET)"; \
	fi

# Ensure nginx configuration is correctly placed
ensure-nginx:
	@if [ -d "./requirements/ngnix" ]; then \
		echo "$(YELLOW)Fixing typo: ngnix -> nginx$(RESET)"; \
		mv ./requirements/ngnix ./requirements/nginx; \
	fi
	@mkdir -p ./requirements/nginx/conf.d
	@if [ -f "./requirements/nginx/conf/blackjack.conf" ]; then \
		echo "$(YELLOW)Moving nginx config to conf.d...$(RESET)"; \
		mv ./requirements/nginx/conf/blackjack.conf ./requirements/nginx/conf.d/; \
		rmdir ./requirements/nginx/conf 2>/dev/null || true; \
	fi
	@if [ ! -f $(NGINX_CONF) ]; then \
		echo "$(RED)❌ Configuration file not found: $(NGINX_CONF)$(RESET)"; \
		exit 1; \
	else \
		echo "$(BLUE)Nginx configuration OK.$(RESET)"; \
	fi

# Create data directory with proper permissions (does not remove existing data)
ensure-data:
	@sudo mkdir -p $(DATA_DIR)
	@sudo chown -R $$(id -u):$$(id -g) ./data

# --- ADDITIONAL TARGETS ---

# Remove generated certificates and .env
clean-config:
	@echo "$(RED)Removing certificates and .env...$(RESET)"
	@rm -f $(CERT_CRT) $(CERT_KEY)
	@rm -f $(ENV_FILE)
	@echo "$(GREEN)✓ Configuration cleaned.$(RESET)"

# Absolute cleanup: fclean + clean-config
distclean: fclean clean-config

# --- HELP / INFO ---

info:
	@echo "$(CYAN)============================================================$(RESET)"
	@echo "$(CYAN)                BLACKJACK - Makefile Help                  $(RESET)"
	@echo "$(CYAN)============================================================$(RESET)"
	@echo ""
	@echo "$(GREEN)Primary Commands:$(RESET)"
	@echo "  make / make all      Full setup + start all services"
	@echo "  make up              Start containers (setup must be done)"
	@echo "  make stop            Stop all containers (preserves data)"
	@echo "  make down            Remove containers and networks (preserves volumes)"
	@echo "  make re              Full reset: fclean + up"
	@echo "  make fclean          Remove EVERYTHING (containers, images, volumes, local DB)"
	@echo "  make logs            View live logs (Ctrl+C to stop)"
	@echo "  make ps              Show container status"
	@echo "  make prune           Remove unused Docker objects (free disk space)"
	@echo ""
	@echo "$(GREEN)Setup & Configuration:$(RESET)"
	@echo "  make setup           Run the configuration phase only (no containers)"
	@echo "  make hosts           Add blackjack.local to /etc/hosts (needs sudo)"
	@echo "  make ensure-certs    Generate self-signed SSL certificate if missing"
	@echo "  make ensure-env      Create .env file with random passwords (interactive for Grafana)"
	@echo "  make ensure-nginx    Fix nginx typo and verify configuration"
	@echo "  make ensure-data     Create local database directory with correct permissions"
	@echo ""
	@echo "$(GREEN)Cleanup:$(RESET)"
	@echo "  make clean-config    Delete only certificates and .env"
	@echo "  make distclean       fclean + clean-config (absolute zero)"
	@echo ""
	@echo "$(CYAN)After first run:$(RESET)"
	@echo "  1. Run $(BLUE)sudo make hosts$(RESET) once to add the local domain."
	@echo "  2. Open $(BLUE)https://blackjack.local$(RESET) (accept self-signed certificate)."
	@echo "  3. Use $(BLUE)make logs$(RESET) to troubleshoot any issues."
	@echo "  4. Grafana: $(BLUE)http://localhost:3001$(RESET) (the credentials you entered)"
	@echo ""

.PHONY: all up logs stop down fclean re ps prune setup \
        ensure-certs ensure-env ensure-hosts ensure-nginx ensure-data \
        hosts clean-config distclean info \
        dev dev-logs dev-down dev-re