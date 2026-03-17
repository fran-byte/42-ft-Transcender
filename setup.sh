#!/bin/bash

# Script de setup automático para Blackjack con Nginx y SSL
# Autor: Setup automatizado
# Uso: ./setup.sh

set -e  # Salir si hay algún error

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   🎰 Blackjack Setup con Nginx y SSL     ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${RESET}"

# Función para mostrar paso
step() {
    echo -e "${GREEN}➜ $1${RESET}"
}

# Función para mostrar advertencia
warn() {
    echo -e "${YELLOW}⚠️  $1${RESET}"
}

# Función para mostrar error
error() {
    echo -e "${RED}❌ $1${RESET}"
}

# 1. Corregir estructura de directorios
step "1/6 Corrigiendo estructura de directorios..."

# Renombrar ngnix -> nginx si existe
if [ -d "./requirements/ngnix" ]; then
    warn "Detectado typo: 'ngnix' -> renombrando a 'nginx'"
    mv ./requirements/ngnix ./requirements/nginx
fi

# Crear conf.d y mover archivo si es necesario
mkdir -p ./requirements/nginx/conf.d

if [ -f "./requirements/nginx/conf/blackjack.conf" ]; then
    mv ./requirements/nginx/conf/blackjack.conf ./requirements/nginx/conf.d/
    rmdir ./requirements/nginx/conf 2>/dev/null || true
fi

if [ ! -f "./requirements/nginx/conf.d/blackjack.conf" ]; then
    error "No se encuentra blackjack.conf en ./requirements/nginx/conf.d/"
    exit 1
fi

echo -e "${GREEN}✓ Estructura de directorios corregida${RESET}"

# 2. Crear directorio para certificados
step "2/6 Creando directorio para certificados SSL..."
mkdir -p ./secrets/certs
echo -e "${GREEN}✓ Directorio creado: ./secrets/certs/${RESET}"

# 3. Generar certificados SSL autofirmados
step "3/6 Generando certificados SSL autofirmados..."

if [ -f "./secrets/certs/blackjack.local.crt" ] && [ -f "./secrets/certs/blackjack.local.key" ]; then
    warn "Los certificados ya existen. ¿Quieres regenerarlos? (s/N)"
    read -r response
    if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
        rm -f ./secrets/certs/blackjack.local.{crt,key}
    else
        echo -e "${BLUE}ℹ️  Usando certificados existentes${RESET}"
    fi
fi

if [ ! -f "./secrets/certs/blackjack.local.crt" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./secrets/certs/blackjack.local.key \
        -out ./secrets/certs/blackjack.local.crt \
        -subj "/C=ES/ST=Madrid/L=Madrid/O=Blackjack/OU=Dev/CN=blackjack.local" \
        -addext "subjectAltName=DNS:blackjack.local,DNS:www.blackjack.local,DNS:localhost" \
        2>/dev/null

    chmod 600 ./secrets/certs/blackjack.local.key
    chmod 644 ./secrets/certs/blackjack.local.crt
    echo -e "${GREEN}✓ Certificados SSL generados${RESET}"
else
    echo -e "${BLUE}ℹ️  Certificados SSL ya existentes${RESET}"
fi

# 4. Configurar archivo .env
step "4/6 Configurando variables de entorno..."

if [ -f ".env" ]; then
    warn "El archivo .env ya existe. ¿Quieres sobrescribirlo? (s/N)"
    read -r response
    if [[ ! "$response" =~ ^([sS][iI]|[sS])$ ]]; then
        echo -e "${BLUE}ℹ️  Usando .env existente${RESET}"
    else
        create_env=true
    fi
else
    create_env=true
fi

if [ "$create_env" = true ]; then
    cat > .env << 'EOF'
# Database Configuration
DB_ROOT_PASSWORD=blackjack_root_pass_$(openssl rand -hex 8)
DB_USER=blackjack_user
DB_PASSWORD=blackjack_pass_$(openssl rand -hex 8)

# Application Configuration
NODE_ENV=production
DOMAIN=https://blackjack.local
FRONTEND_URL=https://blackjack.local

# API Configuration
VITE_API_URL=https://blackjack.local/api
VITE_WS_URL=wss://blackjack.local
EOF
    
    # Generar contraseñas aleatorias
    ROOT_PASS=$(openssl rand -hex 12)
    DB_PASS=$(openssl rand -hex 12)
    
    sed -i "s/blackjack_root_pass_.*$/blackjack_root_pass_${ROOT_PASS}/" .env
    sed -i "s/blackjack_pass_.*$/blackjack_pass_${DB_PASS}/" .env
    
    echo -e "${GREEN}✓ Archivo .env creado con contraseñas seguras${RESET}"
    warn "Guarda estas credenciales en un lugar seguro:"
    echo -e "  DB_ROOT_PASSWORD: blackjack_root_pass_${ROOT_PASS}"
    echo -e "  DB_PASSWORD: blackjack_pass_${DB_PASS}"
fi

# 5. Añadir entrada a /etc/hosts (solo para desarrollo local)
step "5/6 Configurando /etc/hosts para desarrollo local..."

if grep -q "blackjack.local" /etc/hosts 2>/dev/null; then
    echo -e "${BLUE}ℹ️  blackjack.local ya está en /etc/hosts${RESET}"
else
    warn "Para acceder vía https://blackjack.local necesitas añadir una entrada a /etc/hosts"
    echo -e "Se requieren permisos de administrador."
    echo -e "${YELLOW}¿Añadir '127.0.0.1 blackjack.local' a /etc/hosts? (S/n)${RESET}"
    read -r response
    
    if [[ ! "$response" =~ ^([nN][oO]|[nN])$ ]]; then
        echo "127.0.0.1 blackjack.local www.blackjack.local" | sudo tee -a /etc/hosts > /dev/null
        echo -e "${GREEN}✓ Entrada añadida a /etc/hosts${RESET}"
    else
        warn "Tendrás que añadirlo manualmente:"
        echo -e "  ${YELLOW}sudo echo '127.0.0.1 blackjack.local www.blackjack.local' >> /etc/hosts${RESET}"
    fi
fi

# 6. Verificar docker y docker-compose
step "6/6 Verificando Docker..."

if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Instálalo desde: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose no está instalado"
    exit 1
fi

echo -e "${GREEN}✓ Docker y Docker Compose instalados${RESET}"

# Resumen final
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║         ✅ Setup completado               ║${RESET}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${GREEN}Archivos creados/verificados:${RESET}"
echo -e "  ✓ ./secrets/certs/blackjack.local.crt"
echo -e "  ✓ ./secrets/certs/blackjack.local.key"
echo -e "  ✓ ./.env"
echo -e "  ✓ ./requirements/nginx/conf.d/blackjack.conf"
echo ""
echo -e "${YELLOW}Próximos pasos:${RESET}"
echo -e "  1. Revisa el archivo .env y ajusta si es necesario"
echo -e "  2. Levanta los contenedores:"
echo -e "     ${BLUE}make re${RESET}  ${GREEN}# o docker-compose up -d --build${RESET}"
echo -e "  3. Accede a: ${GREEN}https://blackjack.local${RESET}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${RESET}"
echo -e "  - El navegador mostrará advertencia de seguridad (certificado autofirmado)"
echo -e "  - En Chrome: escribe 'thisisunsafe' para continuar"
echo -e "  - Usa certificados Let's Encrypt para producción"
echo ""
echo -e "${BLUE}¿Levantar los contenedores ahora? (S/n)${RESET}"
read -r response

if [[ ! "$response" =~ ^([nN][oO]|[nN])$ ]]; then
    echo -e "${GREEN}🚀 Levantando contenedores...${RESET}"
    make re || docker-compose up -d --build
    echo ""
    echo -e "${GREEN}✅ ¡Todo listo! Accede a: https://blackjack.local${RESET}"
else
    echo -e "${BLUE}Cuando estés listo, ejecuta: ${GREEN}make re${RESET}"
fi

echo ""
echo -e "${BLUE}Happy coding! 🎰${RESET}"
