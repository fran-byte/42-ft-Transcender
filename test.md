
# 🃏 INFORME DE PRUEBAS — BLACKJACK

---

## 🔐 AUTENTICACIÓN

> Todas las pruebas de autenticación han sido completadas satisfactoriamente.

| # | Prueba | Estado |
|---|--------|--------|
| 1 | Registro con username ya existente | ✅ OK |
| 2 | Registro con email ya existente | ✅ OK |
| 3 | Registro con password < 6 caracteres | ✅ OK |
| 4 | Login con credenciales incorrectas | ✅ OK |
| 5 | Acceder a `/lobby` sin cookie JWT | ✅ OK |
| 6 | Cookie `httpOnly` no accesible desde JS | ✅ OK |
| 7 | Denegado acceso a Grafana, Prometheus, cAdvisor (solo accesible desde http://127.0.0.1:3001) | ✅ OK |

---

### 🔍 Detalle — Prueba 5: Acceso a `/lobby` sin cookie JWT

- **Método:** Intentar acceder a la ruta protegida del frontend (ej. `https://blackjack.local/lobby`) sin haber iniciado sesión.
- **Resultado esperado:** Redirección automática a `/login` mediante `ProtectedRoute` de React.
- **Resultado obtenido:** ✅ El componente `ProtectedRoute` detecta la ausencia de autenticación y redirige correctamente a `/login`. Verificado manualmente borrando cookies y usando ventana de incógnito.

---

### 🔍 Detalle — Prueba 6: Cookie `httpOnly` no accesible desde JS

- **Método:** Iniciar sesión y ejecutar `console.log(document.cookie)` desde la consola del navegador.
- **Resultado esperado:** El token JWT no debe ser visible.
- **Resultado obtenido:** ✅ Verificado en DevTools (`Application → Cookies`) — la cookie `token` tiene `HttpOnly = true`. `document.cookie` no expone el token.

---

## 💰 BALANCE Y APUESTAS

### Apuestas máxima permitida por mesa

| # | Mesa | Estado |
|---|------|--------|
| 1 | Solo Table | ✅ No permite apostar > $200 |
| 2 | Golden Table | ✅ No permite apostar > $1000 |
| 3 | Emerald Room | ✅ No permite apostar > $500 |
| 4 | Royal Lounge | ✅ No permite apostar > $2000 |
| 5 | Diamond Room | ✅ No permite apostar > $3500 |
| 6 | Velvet Room | ✅ No permite apostar > $1000 |

---

### Prueba 7 — Depósito y retiro desde Wallet (límites: mín. $10 / máx. $10.000)

**Estado:** ✅

| # | Prueba | Estado |
|---|--------|--------|
| 1 | Retirar/ingresar mínimo | ✅ No permite retirar/ingresar < $10 |
| 2 | Retirar/ingresar máximo | ✅ No permite retirar/ingresar > $10000 |
| 3 | Sin saldo | ✅ No permite apostar con 0 de balance |

---

### Prueba 8 — WEBSOCKETS Y MULTIJUGADOR

**Estado:**

| # | Prueba | Cómo probarlo | Resultado esperado | Estado |
|---|--------|---------------|-------------------|--------|
| 1 | Reconexión tras caída de red | Juega una partida, desconecta el WiFi o para el contenedor de red, luego reconecta. | El jugador debe poder reanudar la partida en el mismo estado (si no expiró el tiempo de gracia). | ⚠️ Pendiente |
| 2 | Espectador promovido a jugador al quedar un asiento libre | Únete como espectador. Haz que un jugador abandone. | El espectador debe pasar a ser jugador automáticamente y poder apostar en la siguiente ronda. | ✅ OK |
| 3 | Dos jugadores apuestan casi a la vez (race condition) | Dos clientes envían `place_bet` con milisegundos de diferencia. | Ambos apuestan correctamente sin que se duplique o se pierda ninguna apuesta. | ✅ OK |
| 4 | El host abandona la partida en medio de una ronda | El jugador que inició la ronda se desconecta. | La ronda debe continuar (el turno pasa al siguiente). Al terminar, otro jugador se convierte en host. | ⚠️ Pendiente |
| 5 | Timeout por inactividad (AFK) | Un jugador no hace nada durante 15 segundos en su turno. | El sistema debe ejecutar `stand` automáticamente y pasar el turno. | ✅ OK |
| 6 | Múltiples salas simultáneas (NO ESTÁ PERMITIDO) | Crear varias salas (Golden, Emerald, etc.) y jugar en cada una con diferentes usuarios. | El estado de cada sala debe ser independiente y no mezclarse. | ✅ OK (Bug solucionado) |
| 7 | Reconexión con el mismo socket ID tras F5 | Recarga la página durante una partida. | El jugador debe recuperar su mano, apuesta y turno (si aún está en juego). | ✅ OK |

---

### ✅ Correcciones aplicadas

- ✅ Eliminado bug de flicker al salir y entrar en otra sala
- ✅ Eliminado bug: si dos usuarios abandonan una sala cuando la partida está en espera de ronda (waiting_for_round), ya no pueden volver a entrar y se quedan como espectadores
- ✅ Reconfigurado `docker-compose.yml` para evitar acceder a los servicios de monitorización desde el exterior

---

## 🛡️ PRUEBAS DE INYECCIÓN (SQLi y XSS)

> Todas las pruebas de inyección han sido completadas satisfactoriamente. El sistema está protegido.

### SQL Injection

| # | Input probado | Lugar de prueba | Resultado | Estado |
|---|---------------|-----------------|-----------|--------|
| 1 | `' OR 1=1; --` | Login (campo email/username) | Credenciales inválidas | ✅ Protegido |
| 2 | `' OR '1'='1` | Login (campo email/username) | Credenciales inválidas | ✅ Protegido |
| 3 | `admin' --` | Login (campo email/username) | Credenciales inválidas | ✅ Protegido |
| 4 | `' OR '1'='1' --` | Login (campo email/username) | Credenciales inválidas | ✅ Protegido |
| 5 | `1' OR '1' = '1' --` | Login (campo email/username) | Credenciales inválidas | ✅ Protegido |

### XSS (Cross-Site Scripting)

| # | Input probado | Lugar de prueba | Resultado | Estado |
|---|---------------|-----------------|-----------|--------|
| 1 | `<script>alert('hacked')</script>` | Registro (campo nombre de usuario) | El texto se muestra literal, no se ejecuta alerta | ✅ Protegido |
| 2 | `<script>alert('hacked')</script>` | Chat (campo mensaje) | El texto se muestra literal, no se ejecuta alerta | ✅ Protegido |
| 3 | `<script>alert('hacked')</script>` | Perfil (campo biografía) | El texto se muestra literal, no se ejecuta alerta | ✅ Protegido |

### Conclusión de pruebas de inyección

- **SQL Injection:** El backend utiliza consultas parametrizadas (ORM). Ninguna de las pruebas logró saltarse la autenticación.
- **XSS:** React escapa automáticamente el contenido. No se utiliza `dangerouslySetInnerHTML` en ningún componente. Las alertas no se ejecutan.

✅ **El sistema está correctamente protegido contra SQL Injection y XSS.**

---