# TEST AUTENTICACIÓN

## Pruebas de autenticación realizadas

### Prueba 1: Registro con username ya existente : OK

### Prueba 2: Registro con email ya existente : BUG Nos deja registrar otro usuario con un mail ya registrado

### Prueba 3: Registro con password < 6 caracteres : OK

### Prueba 4: Login con credenciales incorrectas : OK

### Prueba 5: Acceder a `/game` sin cookie JWT : OK

- **Método**: Intentar acceder a la ruta protegida del frontend (por ejemplo, `https://blackjack.local/game`) sin haber iniciado sesión.
- **Resultado esperado**: Redirección automática a `/login` (mediante `ProtectedRoute` de React).
- **Resultado obtenido**: Al acceder sin cookie, el componente `ProtectedRoute` detecta la ausencia de autenticación y redirige a `/login`. Se comprobó manualmente en el navegador (borrando cookies o usando una ventana de incógnito).  
  **→ OK**

### Prueba 6: Cookie httpOnly no accesible desde JS : OK

- **Método**: Iniciar sesión y desde la consola del navegador ejecutar `console.log(document.cookie)`.
- **Resultado esperado**: No mostrar el token JWT.
- **Resultado obtenido**: Se verificó en las herramientas de desarrollador (Application → Cookies) que la cookie `token` tiene la columna `HttpOnly = true`. Además, `document.cookie` no mostró el token.  
  **→ OK**

---
