# TEST AUTENTICACIÓN

## Pruebas de autenticación realizadas y pasadas

### Prueba 1: Registro con username ya existente : OK

### Prueba 2: Registro con email ya existente : OK

### Prueba 3: Registro con password < 6 caracteres : OK

### Prueba 4: Login con credenciales incorrectas : OK

### Prueba 5: Acceder a `/lobby` sin cookie JWT : OK

- **Método**: Intentar acceder a la ruta protegida del frontend (ejemplo, `https://blackjack.local/lobby`) sin haber iniciado sesión.
- **Resultado esperado**: Redirección automática a `/login` (mediante `ProtectedRoute` de React).
- **Resultado obtenido**: Al acceder sin cookie, el componente `ProtectedRoute` detecta la ausencia de autenticación y redirige a `/login`. Se comprobó manualmente en el navegador (borrando cookies o usando una ventana de incógnito).

### Prueba 6: Cookie httpOnly no accesible desde JS : OK

- **Método**: Iniciar sesión y desde la consola del navegador ejecutar `console.log(document.cookie)`.
- **Resultado esperado**: No mostrar el token JWT.
- **Resultado obtenido**: Se verificó en las herramientas de desarrollador (Application → Cookies) que la cookie `token` tiene la columna `HttpOnly = true`. Además, `document.cookie` no mostró el token.

---

## BALANCE Y APUESTAS

### Prueba 1: Apostar mas de lo que tienes en saldo en SOLO TABLE: BUG Deja apostar teniedo Balance 0

### Prueba 2: Apostar mas de lo que tienes en saldo en GLODEN TABLE: BUG Deja apostar teniedo Balance 0

### Prueba 3: Apostar mas de lo que tienes en saldo en EMERAL ROOM: BUG Deja apostar teniedo Balance 0

### Prueba 4: Apostar mas de lo que tienes en saldo en ROYAL LOUNGE: BUG Deja apostar teniedo Balance 0

### Prueba 5: Apostar mas de lo que tienes en saldo en DIAMON ROOM: BUG Deja apostar teniedo Balance 0

### Prueba 6: Apostar mas de lo que tienes en saldo en VELVET ROOM: BUG Deja apostar teniedo Balance 0

- EL Backend no valida el Balance al hacer place_bet, Solamente BlackjackGame.placeBet existe en Memoria.

## DEPOSITO Y RETIRO desde el Wallet limites min 10$ maximo 10000$ : OK
