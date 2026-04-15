# 🃏 INFORME DE PRUEBAS — BLACKJACK

---

## 🔐 AUTENTICACIÓN

> Todas las pruebas de autenticación han sido completadas satisfactoriamente.

| #   | Prueba                                  | Estado |
| --- | --------------------------------------- | ------ |
| 1   | Registro con username ya existente      | ✅ OK  |
| 2   | Registro con email ya existente         | ✅ OK  |
| 3   | Registro con password < 6 caracteres    | ✅ OK  |
| 4   | Login con credenciales incorrectas      | ✅ OK  |
| 5   | Acceder a `/lobby` sin cookie JWT       | ✅ OK  |
| 6   | Cookie `httpOnly` no accesible desde JS | ✅ OK  |

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

| #   | Mesa         | Estado                          |
| --- | ------------ | ------------------------------- |
| 1   | Solo Table   | ✅ — NO permite apostar > $200  |
| 2   | Golden Table | ✅ — NO permite apostar > $1000 |
| 3   | Emerald Room | ✅ — NO permite apostar > $500  |
| 4   | Royal Lounge | ✅ — NO permite apostar > $2000 |
| 5   | Diamond Room | ✅ — NO permite apostar > $3500 |
| 6   | Velvet Room  | ✅ — NO permite apostar > $1000 |

---

### Prueba 7 — Depósito y retiro desde Wallet (límites: mín. $10 / máx. $10.000)

**Estado:** ✅

| #   | BlackJAck            | Estado                                    |
| --- | -------------------- | ----------------------------------------- |
| 1   | Retirar/ingresar min | ✅ — NO permite retirar/Ingresar < $10    |
| 2   | Retirar/ingresar máx | ✅ — NO permite retirar/Ingresar > $10000 |
| 3   | Sin saldo            | ✅ — NO permite apostar con 0 de Balance  |

### Prueba 8 — WEBSOCKETS Y MULTIJUGADOR

**Estado:**

| #   | Prueba                                                           | Cómo probarlo                                                                          | Resultado esperado                                                                                    |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | **Reconexión tras caída de red** (aún ??)                        | Juega una partida, desconecta el WiFi o para el contenedor de red, luego reconecta.    | El jugador debe poder reanudar la partida en el mismo estado (si no expiró el tiempo de gracia).      |
| 2   | **Espectador promovido a jugador al quedar un asiento libre** ✅ | Únete como espectador. Haz que un jugador abandone.                                    | El espectador debe pasar a ser jugador automáticamente y poder apostar en la siguiente ronda.         |
| 3   | **Dos jugadores apuestan casi a la vez (race condition)** ✅     | Dos clientes envían `place_bet` con milisegundos de diferencia.                        | Ambos apuestan correctamente sin que se duplique o se pierda ninguna apuesta.                         |
| 4   | **El host abandona la partida en medio de una ronda** (aún ??)   | El jugador que inició la ronda se desconecta.                                          | La ronda debe continuar (el turno pasa al siguiente). Al terminar, otro jugador se convierte en host. |
| 5   | **Timeout por inactividad (AFK)** ✅                             | Un jugador no hace nada durante 15 segundos en su turno.                               | El sistema debe ejecutar `stand` automáticamente y pasar el turno.                                    |
| 6   | **Múltiples salas simultáneas ** 💥                              | Crea varias salas (Golden, Emerald, etc.) y juega en cada una con diferentes usuarios. | El estado de cada sala debe ser independiente y no mezclarse. BUG !!!!!!                              |
| 7   | **Reconexión con el mismo socket ID tras F5** ✅                 | Recarga la página durante una partida.                                                 | El jugador debe recuperar su mano, apuesta y turno (si aún está en juego).                            |

---
