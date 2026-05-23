_Este proyecto ha sido creado como parte del currículo de 42 por frromero, allera-m, msoriano, maanguit y mamagalh_

# ft_transcendence — Blackjack

[🇬🇧 English version](../README.md)

## Descripción

ft_transcendence es una plataforma multijugador de blackjack en tiempo real desarrollada como parte del currículo de 42.

El objetivo del proyecto fue construir una aplicación web full-stack completa que combina:

- Partidas multijugador en tiempo real
- Autenticación y gestión de usuarios
- Frontend responsivo
- Sincronización mediante WebSockets
- Oponentes controlados por IA
- Estadísticas e historial persistente
- Infraestructura HTTPS segura
- Despliegue con Docker

La aplicación permite que múltiples usuarios jueguen al blackjack simultáneamente en tiempo real gracias a la sincronización con Socket.IO.

---

## Características Principales

- Mesas de blackjack multijugador
- Oponentes con IA
- Modo espectador
- Sincronización de partidas en tiempo real
- Gestión de reconexiones con temporizadores de gracia
- Historial de partidas y tabla de clasificación
- Sistema de autenticación seguro
- Diseño responsivo
- Infraestructura Dockerizada
- Soporte HTTPS
- Stack de monitorización con Grafana y Prometheus

---

# Instrucciones

## Requisitos Previos

Software necesario:

- Docker
- Docker Compose
- Make

---

## Instalación

Clonar el repositorio:

```bash
git clone <repository_url>
cd ft_transcendence
```

---

## Iniciar el Proyecto

Ejecutar:

```bash
make
```

Esto automáticamente:

- Construye los contenedores
- Genera los certificados SSL
- Crea las variables de entorno
- Inicia todos los servicios

---

## Acceso

| Servicio   | URL                     |
| ---------- | ----------------------- |
| Aplicación | https://blackjack.local |
| Grafana    | http://localhost:3001   |
| Prometheus | http://localhost:9090   |
| cAdvisor   | http://localhost:8080   |

> ⚠️ Se utilizan certificados SSL autofirmados para el desarrollo local.

---

# Recursos

## Documentación

- https://react.dev/
- https://socket.io/docs/
- https://expressjs.com/
- https://www.postgresql.org/docs/
- https://docs.docker.com/
- https://nginx.org/en/docs/
- https://grafana.com/docs/
- https://prometheus.io/docs/

---

## Documentación Adicional

Documentación técnica adicional:

- `docs/docker.md`
- `docs/gameplay.md`

---

# Uso de IA

Durante el desarrollo, se utilizaron herramientas de IA (ChatGPT, GitHub Copilot) para:

- Generación de documentación en el código (comentarios JSDoc, descripciones de funciones)
- Ayuda en la depuración de problemas de sincronización WebSocket y reconexión
- Identificación y corrección de errores recurrentes en componentes React
- Revisión y refactorización de código para optimización del rendimiento (`useMemo`, `React.memo`)
- Generación de código repetitivo y de plantilla

Todo el código generado por IA fue revisado, probado y completamente comprendido por los miembros del equipo antes de su integración. No se copió ningún código sin entenderlo.

---

# Información del Equipo

## msoriano

### Roles

- PM
- Desarrollador Frontend
- Desarrollador de Gameplay

### Responsabilidades

- Arquitectura frontend (responsable principal)
- UI/UX del juego
- Modo espectador
- Diseño responsivo
- Sincronización multijugador
- Lógica del juego de blackjack

---

## frromero

### Roles

- Desarrollador de Infraestructura
- Soporte Backend

### Responsabilidades

- Infraestructura Docker (docker-compose.yml, orquestación multi-contenedor)
- Configuración de Nginx y HTTPS (certificados autofirmados, reverse proxy)
- Automatización con Makefile para la configuración del proyecto
- Soporte en la API backend (asistencia a allera-m con depuración y correcciones)
- Soporte en la integración con PostgreSQL

---

## maanguit

### Roles

- Desarrollador de IA
- Soporte Backend
- Soporte Frontend

### Responsabilidades

- Integración de IA en el backend (lógica y comportamiento del oponente IA)
- Soporte backend (asistencia a allera-m en tareas de backend)
- Soporte frontend (asistencia a msoriano en tareas de frontend)
- Testing

---

## allera-m

### Roles

- Tech Lead
- Desarrollador Full Stack (Responsable Principal del Backend)

### Responsabilidades

- Arquitectura del sistema
- Sincronización WebSocket
- Gestión del juego multijugador
- API backend (responsable principal)
- Lógica del sistema de autenticación
- Gestión de reconexiones y desconexiones
- Revisión de código e integración

---

## mamagalh

### Roles

- Desarrollador DevOps / Monitorización
- Soporte Docker

### Responsabilidades

- Integración de métricas con Prometheus, Grafana y cAdvisor (3 servicios)
- Soporte en la orquestación Docker (asistencia a frromero en la configuración de contenedores)
- Dashboards personalizados en Grafana
- Monitorización del rendimiento de contenedores

---

# Gestión del Proyecto

## Organización del Trabajo

El proyecto se desarrolló de forma iterativa distribuyendo las tareas entre frontend, backend, infraestructura y sistemas de gameplay.

El desarrollo incluyó:

- Planificación de funcionalidades
- Reuniones de sincronización semanales
- Integración incremental
- Depuración y pruebas colaborativas

---

## Herramientas de Gestión

- GitHub
- GitHub Issues
- Ramas Git y pull requests
- Docker Compose

---

## Comunicación

- Discord
- 42 intra
- GitHub discussions

---

# Stack Tecnológico

## Frontend

- React
- Vite
- React Router
- CSS

### ¿Por qué React?

React fue elegido porque:

- Arquitectura basada en componentes
- Renderizado rápido de la interfaz
- Gestión de estado sencilla
- Ecosistema sólido para aplicaciones SPA

---

## Backend

- Node.js
- Express.js
- Socket.IO

### ¿Por qué Express + Socket.IO?

- Arquitectura backend ligera
- Excelente soporte para WebSockets
- Sincronización en tiempo real
- Fácil integración con APIs REST

---

## Base de Datos

- PostgreSQL

### ¿Por qué PostgreSQL?

PostgreSQL fue elegido porque:

- Alta fiabilidad
- Cumplimiento ACID
- Estructura relacional adecuada para usuarios, partidas y estadísticas
- Excelente soporte con Docker

---

## Infraestructura

- Docker
- Docker Compose
- Nginx
- HTTPS/SSL
- Prometheus
- Grafana
- cAdvisor

---

# Esquema de Base de Datos

## Tablas Principales

### users

Almacena cuentas de usuario y datos de autenticación.

| Campo         | Tipo    |
| ------------- | ------- |
| id            | INTEGER |
| username      | VARCHAR |
| email         | VARCHAR |
| password_hash | VARCHAR |
| balance       | INTEGER |

---

### stats

Almacena estadísticas de los jugadores.

| Campo        | Tipo    |
| ------------ | ------- |
| user_id      | INTEGER |
| wins         | INTEGER |
| losses       | INTEGER |
| games_played | INTEGER |

---

### history

Almacena el historial de partidas.

| Campo        | Tipo      |
| ------------ | --------- |
| id           | INTEGER   |
| user_id      | INTEGER   |
| result       | VARCHAR   |
| chips_change | INTEGER   |
| created_at   | TIMESTAMP |

---

## Relaciones

```txt
users
 ├── stats
 └── history
```

---

## Diagrama del Esquema

```text
┌─────────────────┐     ┌─────────────────┐
│      users      │     │      stats      │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │────<│ user_id (FK)    │
│ username        │     │ wins            │
│ email           │     │ losses          │
│ password_hash   │     │ games_played    │
│ balance         │     └─────────────────┘
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│     history     │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ result          │
│ chips_change    │
│ created_at      │
└─────────────────┘
```

---

# Lista de Funcionalidades

| Funcionalidad                | Descripción                             | Miembro(s) del equipo                    |
| ---------------------------- | --------------------------------------- | ---------------------------------------- |
| Blackjack Multijugador       | Partidas de blackjack en tiempo real    | msoriano, allera-m                       |
| Sistema de Autenticación     | Sistema de registro/login/logout        | allera-m (principal), frromero (soporte) |
| Oponente IA                  | Bots automáticos de blackjack           | maanguit                                 |
| Modo Espectador              | Ver partidas en curso en directo        | msoriano                                 |
| Estadísticas y Clasificación | Sistema de estadísticas persistente     | allera-m (principal), frromero (soporte) |
| Diseño Responsivo            | Soporte para móvil y tablet             | msoriano                                 |
| Infraestructura HTTPS        | Despliegue seguro con HTTPS             | frromero                                 |
| Stack de Monitorización      | Integración Grafana/Prometheus/cAdvisor | mamagalh                                 |
| Sistema de Reconexión        | Temporizadores de gracia y recuperación | allera-m                                 |
| Orquestación Docker          | Configuración multi-contenedor          | frromero (principal), mamagalh (soporte) |

---

# Módulos

| Módulo                                        | Tipo  | Puntos |
| --------------------------------------------- | ----- | ------ |
| Framework Frontend + Backend                  | Mayor | 2      |
| Funcionalidades en Tiempo Real con WebSockets | Mayor | 2      |
| Estadísticas / Historial                      | Menor | 1      |
| Oponente IA                                   | Mayor | 2      |
| Juego Web                                     | Mayor | 2      |
| Jugadores Remotos                             | Mayor | 2      |
| Juego Multijugador (3+ jugadores)             | Mayor | 2      |
| Modo Espectador                               | Menor | 1      |
| Soporte para Navegadores Adicionales          | Menor | 1      |
| Backend como Microservicios                   | Mayor | 2      |

**Total: 19 puntos (14 requeridos + 5 bonus)**

---

# Justificación de Módulos

## Framework Frontend + Backend

Implementado con React y Express.js.

## Funcionalidades en Tiempo Real con WebSockets

Implementado con Socket.IO para la sincronización multijugador.

## Gestión Estándar de Usuarios

Autenticación JWT, cookies seguras, sistema de registro/login/logout.

## Estadísticas / Historial

Estadísticas de jugadores e historial de partidas almacenados de forma persistente en PostgreSQL.

## Oponente IA

Autor: maanguit

`ml_service/` es un microservicio Python dedicado que ejecuta un **Dueling Double DQN** (D3QN) con **Prioritized Experience Replay** (PER), entrenado con PyTorch y servido en tiempo de ejecución como una API REST Flask (`POST /predict`) usando inferencia pura con NumPy. La IA recibe el estado del juego (puntuación del jugador, carta del crupier, as utilizable, conteo verdadero, posibilidad de doblar) y devuelve la acción óptima (pedir / plantarse / doblar). Recompensa media entrenada ~-0.0186 — competitivo sin ser perfecto. El backend recurre a una estrategia básica si el servicio ML no está disponible.

## Juego Web

Juego de blackjack completamente jugable desde el navegador.

## Jugadores Remotos

Partidas multijugador en tiempo real entre diferentes clientes.

## Juego Multijugador

Múltiples jugadores simultáneos interactuando en la misma sala.

## Modo Espectador

Los usuarios pueden ver partidas en curso y unirse cuando haya sitio disponible.

## Backend como Microservicios

Autor: maanguit

El directorio `ml_service/` es el microservicio dedicado que satisface este módulo: un contenedor Python/Flask independiente con una única responsabilidad (inferencia DQN para el oponente IA), completamente desacoplado del backend Node.js. Expone una API REST limpia (`POST /predict`, `GET /health`) y es invocado por el backend a través de la red interna de Docker. Cada servicio del stack (frontend, backend, base de datos, ml_service, nginx, monitorización) corre en su propio contenedor con su propio Dockerfile y configuración, orquestados mediante docker-compose. Nginx actúa como puerta de entrada externa — `ml_service` nunca queda expuesto directamente.

## Soporte para Navegadores Adicionales

Compatibilidad probada con:

- Chrome
- Firefox
- Edge

---

# Legal

La aplicación incluye páginas accesibles de Política de Privacidad y Términos de Servicio, accesibles mediante enlaces en el pie de página desde cualquier página de la aplicación. Estas páginas contienen contenido relevante específico para este proyecto y no son páginas de relleno.

---

# Contribuciones Individuales

## msoriano

- Arquitectura frontend (responsable principal)
- Diseño responsivo
- Sistema de espectador
- Implementación de la UI del juego
- Sistema de lobby

### Dificultades

Gestión de layouts multijugador responsivos y problemas de sincronización.

---

## frromero

- Infraestructura Docker (responsable principal)
- Configuración de Nginx y HTTPS
- Automatización con Makefile
- Soporte en la API backend (asistencia a allera-m)
- Soporte en la integración con PostgreSQL

### Dificultades

Configuración de la red entre contenedores y del reverse proxy HTTPS.

---

## maanguit

- Integración de IA en el backend (responsable principal)
- Soporte backend (asistencia a allera-m)
- Soporte frontend (asistencia a msoriano)
- Testing

### Dificultades

Integrar la lógica de IA dentro de la arquitectura backend existente y mantener un entorno de desarrollo estable.

---

## allera-m

- API backend (responsable principal)
- Lógica del sistema de autenticación
- Sincronización WebSocket
- Gestión del juego multijugador
- Gestión de reconexiones y desconexiones
- Sistema de estadísticas e historial

### Dificultades

Gestión de condiciones de carrera, lógica de reconexión y casos límite del multijugador.

---

## mamagalh

- Integración de métricas con Prometheus, Grafana y cAdvisor (responsable principal — 3 servicios)
- Orquestación del stack de monitorización
- Dashboards personalizados en Grafana
- Monitorización del rendimiento de contenedores
- Soporte en la orquestación Docker (asistencia a frromero)

### Dificultades

Configurar tres servicios de monitorización para que funcionen conjuntamente y muestren métricas significativas.

---

# Sistema Multijugador en Tiempo Real

La aplicación utiliza Socket.IO para la sincronización en tiempo real entre todos los clientes.

Las funcionalidades implementadas incluyen:

- Sincronización por salas
- Sincronización de turnos
- Sincronización para espectadores
- Temporizadores de gracia en desconexión
- Recuperación ante reconexiones
- Difusión del estado en tiempo real
