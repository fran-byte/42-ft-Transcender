# --- COLORES PARA EL OUTPUT (Visualmente ayuda mucho) ---
GREEN		= \033[0;32m
RED			= \033[0;31m
RESET		= \033[0m

# --- VARIABLES ---
COMPOSE		= docker compose
NAME		= transcendence

# --- REGLAS PRINCIPALES ---

# 1. 'make' o 'make all': Levanta todo en segundo plano (Detached)
all: up

# 2. Levanta los contenedores y construye las imágenes si es necesario
up:
	@echo "$(GREEN)Building and starting containers...$(RESET)"
	$(COMPOSE) up -d --build
	@echo "$(GREEN)✅ Todo listo! Accede a:$(RESET)"
	@echo "      https://localhost"
# @echo "   Frontend: http://localhost:5173"
# @echo "   Backend:  http://localhost:3000"

# 3. 'make logs': Ver qué está pasando (console.log, errores, etc)
logs:
	@echo "$(GREEN)Showing logs (Ctrl+C to exit)...$(RESET)"
	$(COMPOSE) logs -f

# 4. 'make stop': Para los contenedores pero NO borra nada (pausa)
stop:
	@echo "$(RED)Stopping containers...$(RESET)"
	$(COMPOSE) stop

# 5. 'make down': Para y borra los contenedores y redes (pero mantiene la DB)
down:
	@echo "$(RED)Removing containers and networks...$(RESET)"
	$(COMPOSE) down

# 6. 'make fclean': BORRADO TOTAL (Incluye Base de Datos y volúmenes)
# Úsalo si quieres empezar de cero absoluto.
#fclean:
#	@echo "$(RED)🔥 NUKING EVERYTHING (Containers, Networks, Images, Volumes)...$(RESET)"
#	$(COMPOSE) down -v --rmi all --remove-orphans
#	@echo "$(GREEN)✅ Sistema limpio y reseteado.$(RESET)"

fclean:
	@echo "$(RED)🔥 NUKING EVERYTHING (Containers, Networks, Images, Volumes)...$(RESET)"
	$(COMPOSE) down -v --rmi all --remove-orphans
	@echo "$(RED)🗑️  Removing local database files...$(RESET)"
	@sudo rm -rf ./data/postgres
	@sudo mkdir -p ./data/postgres
	@sudo chown -R $$(id -u):$$(id -g) ./data
	@echo "$(GREEN)✅ Sistema limpio y reseteado.$(RESET)"


# 7. 'make re': Reinicio total (Borra todo y vuelve a levantar)
re: fclean up

# 8. 'make ps': Ver estado de los contenedores
ps:
	$(COMPOSE) ps

# 9. 'make prune': Limpieza profunda de Docker (Por si te quedas sin espacio en la VM)
prune:
	@echo "$(RED)⚠️  Pruning unused Docker objects...$(RESET)"
	docker system prune -a -f

.PHONY: all up logs stop down fclean re ps prune
