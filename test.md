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

**Estado:** 🐛 Aún con BUGs

| #   | BlackJAck             | Estado                                                      |
| --- | --------------------- | ----------------------------------------------------------- |
| 1   | Retirar/ingresar min  | ✅ — NO permite retirar/Ingresar < $10                      |
| 2   | Retirar/ingresar min  | ✅ — NO permite retirar/Ingresar < $10000                   |
| 3   | Sin saldo             | 🐛 — SI deja apostar con Balance 0 BUG Balance/Wallet       |
| 4   | Operaciones de Wallet | 🐛 — Incongruencias del wallet al sumar o restar cantidades |

---

_📋 Informe en progreso — pendiente de continuar._
