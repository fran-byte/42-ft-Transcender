🃏 ESPECIFICACIONES DEL BLACKJACK

Reglas básicas a implementar:

1. Mazo: 1-8 barajas (52 cartas cada una)
2. Valores de cartas:
   · 2-10: valor nominal
   · J, Q, K: 10 puntos
   · As: 1 u 11 puntos (automático según mejor mano)
3. Acciones del jugador:
   · Pedir carta (Hit)
   · Plantarse (Stand)
   · Doblar apuesta (Double)
   · Dividir (Split) - OPCIONAL
   · Seguro (Insurance) - OPCIONAL
4. Reglas del dealer:
   · Se planta en 17 o más
   · Pide en 16 o menos
   · As cuenta como 11 si no se pasa de 21

---

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

### Contenedores

```
services:
  frontend:    # Un contenedor para la interfaz web: Puerto Interno: 5173
  backend:     # Un contenedor para la lógica : Puerto Interno: 3000
  db:          # Un contenedor para la base de datos : Puerto Interno: 5432
  nginx:       # Un contenedor para el servidor web : Puerto Externo 80 y 443

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

https://blackjack.local
