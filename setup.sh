#!/bin/bash

# Script de setup SSL y .env para Blackjack
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
echo "║   🎰 Blackjack Setup SSL y .env          ║"
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
step "1/4 Corrigiendo estructura de directorios..."

if [ -d "./requirements/ngnix" ]; then
    warn "Detectado typo: 'ngnix' -> renombrando a 'nginx'"
    mv ./requirements/ngnix ./requirements/nginx
fi

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
step "2/4 Creando directorio para certificados SSL..."
mkdir -p ./secrets/certs
echo -e "${GREEN}✓ Directorio creado: ./secrets/certs/${RESET}"

# 3. Generar certificados SSL autofirmados
step "3/4 Generando certificados SSL autofirmados..."

if [ -f "./secrets/certs/blackjack.com.crt" ] && [ -f "./secrets/certs/blackjack.com.key" ]; then
    warn "Los certificados ya existen. ¿Quieres regenerarlos? (s/N)"
    read -r response
    if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
        rm -f ./secrets/certs/blackjack.com.{crt,key}
    else
        echo -e "${BLUE}ℹ️  Usando certificados existentes${RESET}"
    fi
fi

if [ ! -f "./secrets/certs/blackjack.com.crt" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./secrets/certs/blackjack.com.key \
        -out ./secrets/certs/blackjack.com.crt \
        -subj "/C=ES/ST=Madrid/L=Madrid/O=Blackjack/OU=Dev/CN=blackjack.com" \
        -addext "subjectAltName=DNS:blackjack.com,DNS:www.blackjack.com,DNS:localhost" \
        2>/dev/null

    chmod 600 ./secrets/certs/blackjack.com.key
    chmod 644 ./secrets/certs/blackjack.com.crt
    echo -e "${GREEN}✓ Certificados SSL generados${RESET}"
else
    echo -e "${BLUE}ℹ️  Certificados SSL ya existentes${RESET}"
fi

# 4. Configurar archivo .env
step "4/4 Configurando variables de entorno..."

create_env=false

if [ -f ".env" ]; then
    warn "El archivo .env ya existe. ¿Quieres sobrescribirlo? (s/N)"
    read -r response
    if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
        create_env=true
    else
        echo -e "${BLUE}ℹ️  Usando .env existente${RESET}"
    fi
else
    create_env=true
fi

if [ "$create_env" = true ]; then
    ROOT_PASS=$(openssl rand -hex 12)
    DB_PASS=$(openssl rand -hex 12)

    cat > .env << EOF
# Database Configuration
DB_ROOT_PASSWORD=blackjack_root_pass_${ROOT_PASS}
DB_USER=blackjack_user
DB_PASSWORD=blackjack_pass_${DB_PASS}

# Application Configuration
NODE_ENV=production
DOMAIN=https://blackjack.com
FRONTEND_URL=https://blackjack.com

# API Configuration
VITE_API_URL=https://blackjack.com/api
VITE_WS_URL=wss://blackjack.com
EOF

    echo -e "${GREEN}✓ Archivo .env creado con contraseñas seguras${RESET}"
    warn "Guarda estas credenciales en un lugar seguro:"
    echo -e "  DB_ROOT_PASSWORD: blackjack_root_pass_${ROOT_PASS}"
    echo -e "  DB_PASSWORD: blackjack_pass_${DB_PASS}"
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║      ✅ Setup SSL y .env completado      ║${RESET}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${GREEN}Archivos creados/verificados:${RESET}"
echo -e "  ✓ ./secrets/certs/blackjack.com.crt"
echo -e "  ✓ ./secrets/certs/blackjack.com.key"
echo -e "  ✓ ./.env"
echo -e "  ✓ ./requirements/nginx/conf.d/blackjack.conf"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${RESET}"
echo -e "  - El navegador mostrará advertencia de seguridad (certificado autofirmado)"
echo -e "  - Usa Let's Encrypt para producción"
echo ""
echo -e "${BLUE}Utiliza ahora <sudo make up> ! 🎰${RESET}"
