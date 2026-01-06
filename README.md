# 42-ft-Transcender

# 📋 **SOLO LO OBLIGATORIO - DISTRIBUCIÓN PARA 4 PERSONAS**

## 🚨 **LO ABSOLUTAMENTE OBLIGATORIO**

### **1. DOCKER (1 sola persona)**
**Tareas:**
- Crear `docker-compose.yml` con PHP + MySQL
- Asegurar que con `docker-compose up` todo funcione
- Probar en otra máquina que funciona

**Archivos a entregar:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: php:8.2-apache
    ports: ["8080:80"]
    volumes: [".:/var/www/html"]
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: appdb
```

### **2. LOGIN/REGISTRO SEGURO (1 persona)**
**Tareas:**
- `register.php` (formulario registro)
- `login.php` (formulario login)
- Encriptar contraseñas con `password_hash()`
- Sesiones PHP con `session_start()`

**Archivos:**
```php
// register.php
<?php
if ($_POST) {
    $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
    // Guardar $hash en BD
}
?>
```

### **3. FRONTEND + PÁGINAS LEGALES (1 persona)**
**Tareas:**
- Todas las páginas con Bootstrap (`<link bootstrap>`)
- `index.html` (página principal)
- `privacy-policy.html` (texto real, copiar de internet)
- `terms-of-service.html` (texto real, copiar de internet)
- Footer con links a políticas en TODAS las páginas

**Archivos:**
```html
<!-- En TODAS las páginas -->
<footer>
  <a href="/privacy-policy.html">Privacy Policy</a> | 
  <a href="/terms-of-service.html">Terms of Service</a>
</footer>
```

### **4. BASE DE DATOS + MULTI-USER (1 persona)**
**Tareas:**
- Crear BD MySQL con tabla `users`
- Asegurar que 2 usuarios pueden estar logeados a la vez
- Probar acciones simultáneas

**SQL:**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 👥 **DISTRIBUCIÓN EQUITATIVA**

### **PERSONA A: "El Docker"**
```
✅ docker-compose.yml
✅ .dockerignore
✅ README.md con instrucciones Docker
❌ NO toca PHP/HTML
```

### **PERSONA B: "El Login"**
```
✅ register.php
✅ login.php  
✅ logout.php
✅ sessions (session_start())
❌ NO toca Docker/HTML
```

### **PERSONA C: "El Diseñador"**
```
✅ index.html
✅ privacy-policy.html (TEXTO REAL)
✅ terms-of-service.html (TEXTO REAL)
✅ Bootstrap en TODAS
❌ NO toca PHP/BD
```

### **PERSONA D: "El BD"**
```
✅ script.sql (crear BD)
✅ conexion.php (conectar a MySQL)
✅ probar 2 usuarios simultáneos
❌ NO toca Docker/HTML
```

---

## 📁 **ESTRUCTURA MÍNIMA DEL REPOSITORIO**

```
transcendence/
├── docker-compose.yml          # Persona A
├── README.md                   # Persona A
├── index.html                  # Persona C
├── privacy-policy.html         # Persona C (TEXTO COPIADO)
├── terms-of-service.html       # Persona C (TEXTO COPIADO)
├── register.php               # Persona B
├── login.php                  # Persona B
├── logout.php                 # Persona B
├── conexion.php               # Persona D
├── script.sql                 # Persona D (CREATE TABLE...)
└── assets/
    └── css/
        └── style.css          # Persona C (opcional)
```

---

## ✅ **CHECKLIST FINAL OBLIGATORIO**

### **Docker (Persona A):**
- [ ] `docker-compose up` funciona
- [ ] Puerto 8080 accesible
- [ ] MySQL y PHP funcionan

### **Login (Persona B):**
- [ ] Registro guarda en BD
- [ ] Login verifica contraseña
- [ ] Passwords encriptadas con `password_hash`
- [ ] Sesiones funcionan

### **Frontend (Persona C):**
- [ ] Bootstrap incluido
- [ ] Responsive (probar móvil/PC)
- [ ] Privacy Policy (texto real, no "lorem ipsum")
- [ ] Terms of Service (texto real)
- [ ] Links en footer funcionan

### **BD (Persona D):**
- [ ] Tabla `users` existe
- [ ] 2 usuarios pueden registrarse
- [ ] 2 sesiones simultáneas funcionan
- [ ] No hay errores de concurrencia

### **Todos:**
- [ ] Commits en Git con vuestros nombres
- [ ] Probar en Chrome último (F12 → sin errores)
- [ ] README con instrucciones claras

---

## ⏱️ **PLAN SEMANAL (3 semanas máximo)**

**Semana 1:** Cada persona hace su parte por separado
**Semana 2:** Integración (juntar todo)
**Semana 3:** Testing y corrección de errores

---




---

¿Esta distribución clara y simple os parece viable? Cada uno tiene su responsabilidad muy definida.
