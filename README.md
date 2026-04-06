🃏 ESPECIFICACIONES DEL BLACKJACK

## Technical Stack

- **Frontend**: React 18 with Vite for fast development and HMR.
- **Backend**: Node.js 22 with Express for REST API and Socket.IO for real-time communication.
- **Database**: MySQL 8.0 chosen chosen for for its ACID compliance and robust JSON support for hand storage.
- **Reverse Proxy**: Nginx (Alpine) for SSL termination and routing.
- **Orchestration**: Docker Compose for multi-container deployment.
- **Other**: bcrypt for password hashing, JWT for sessions, Redis for optional session caching.

## Database Schema

## Resumen

### Flujo de registro y juego

```
Usuario se registra → Frontend (React) envía datos al backend
                    ↓
         Backend (Node.js) encripta contraseña
                    ↓
         Guarda usuario en PostgreSQL (balance: 1000)
                    ↓
         Crea token JWT y lo envía en cookie httpOnly
                    ↓
         Usuario inicia sesión automáticamente
                    ↓
         Juega al Blackjack (apuestas, hit, stand)
                    ↓
         Al terminar: guarda estadísticas en BD
                    ↓
         Perfil muestra estadísticas desde el backend
```

### Tecnologías

| Capa          | Tecnología        |
| ------------- | ----------------- |
| Frontend      | React + Vite      |
| Backend       | Node.js + Express |
| Base de datos | PostgreSQL        |
| Proxy         | Nginx             |
| WebSockets    | Socket.io         |
| Contenedores  | Docker Compose    |

### Endpoints principales

| Método | Endpoint             | Función              |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Registro             |
| POST   | `/api/auth/login`    | Login                |
| GET    | `/api/auth/stats`    | Obtener estadísticas |
| POST   | `/api/auth/stats`    | Guardar estadísticas |
| POST   | `/api/auth/balance`  | Actualizar balance   |

### Acceso

```
https://blackjack.local
```
