# 42-ft-Transcender


---

## 👥 **DISTRIBUCIÓN DE ROLES CON PHP**

### **PERSONA 1: PHP BACKEND LEAD + DOCKER**
- **Roles combinados:** Technical Lead + Backend Developer + DevOps
- **Tecnologías a usar:** PHP puro/Laravel, MySQL, Docker, Apache
- **Módulos principales a su cargo:**
  1. **Backend framework** (Laravel/Symfony) - 1-2 puntos
  2. **Docker** (contenedorización) - requisito obligatorio
  3. **Base de datos MySQL** - diseño e implementación
  4. **API REST** (si hacéis) - 2 puntos
- **Tareas concretas:**
  - Configurar Docker con PHP + Apache + MySQL
  - Crear estructura de Laravel/proyecto PHP
  - Diseñar base de datos (tablas usuarios, partidas, chat)
  - Implementar lógica principal del backend

---

### **PERSONA 2: FRONTEND + DISEÑO**
- **Roles combinados:** Frontend Developer + UI/UX Designer
- **Tecnologías a usar:** HTML, CSS, Bootstrap, JavaScript mínimo
- **Módulos principales a su cargo:**
  1. **Frontend responsive** - requisito general
  2. **CSS Framework** (Bootstrap/Tailwind) - requisito
  3. **Accesibilidad** (WCAG) - 2 puntos (opcional)
  4. **Diseño de interfaz** - que se vea bien
- **Tareas concretas:**
  - Crear todas las páginas HTML: login, registro, perfil, juego
  - Aplicar Bootstrap para que sea responsive
  - Diseñar interfaz del juego (canvas HTML5)
  - Asegurar que funcione en Chrome

---

### **PERSONA 3: USUARIOS + SEGURIDAD**
- **Roles combinados:** Product Owner + Security + User Management
- **Tecnologías a usar:** PHP (autenticación), MySQL, Sessions
- **Módulos principales a su cargo:**
  1. **User Management** (sistema usuarios) - 2 puntos
  2. **Login/Registro seguro** - requisito técnico
  3. **OAuth** (Google/GitHub) - 1 punto (opcional)
  4. **Gamificación** (logros, niveles) - 1 punto
- **Tareas concretas:**
  - Sistema de registro/login con contraseñas encriptadas
  - Páginas de perfil de usuario
  - Amigos/chat básico entre usuarios
  - Sistema de logros y puntuaciones

---

### **PERSONA 4: JUEGO + TIEMPO REAL**
- **Roles combinados:** Game Developer + Real-time Features
- **Tecnologías a usar:** JavaScript (para juego), PHP/WebSockets, Canvas
- **Módulos principales a su cargo:**
  1. **Web-based game** (Pong/Chess/etc) - 2 puntos
  2. **Real-time features** (WebSockets) - 2 puntos
  3. **Chat en tiempo real** - parte de User Interaction
  4. **AI Opponent** (bot) - 2 puntos (opcional)
- **Tareas concretas:**
  - Programar el juego en JavaScript (Canvas API)
  - Implementar WebSockets con Ratchet (PHP) para tiempo real
  - Hacer que 2 jugadores puedan jugar en vivo
  - Chat instantáneo entre usuarios

---

## 📊 **VISUALIZACIÓN DE DEPENDENCIAS:**

```
PERSONA 1 (PHP/Docker)
    ├── Crea servidor Docker ─────┐
    ├── Instala Laravel/PHP ──────┼───┐
    └── Diseña BD MySQL ───────────┘   │
                                        ↓
PERSONA 2 (Frontend)                  SERVIDOR
    ├── HTML/CSS pages ◄────────────── (PHP)
    ├── Bootstrap styling ◄──────────── (PHP)
    └── Interfaz juego ◄─────────────── (JS+PHP)
                                        ↑
PERSONA 3 (Usuarios)                   │
    ├── Login/Registro ────────────────┘
    ├── Perfiles usuarios ─────────────┘
    └── Sistema amigos ────────────────┘
                                        ↓
PERSONA 4 (Juego/Real-time)           BASE DE DATOS
    ├── Juego Canvas JS ◄────────────── (MySQL)
    ├── WebSockets tiempo real ◄─────── (Ratchet PHP)
    └── Chat instantáneo ◄────────────── (PHP/JS)
```

---

## 📅 **PLAN SEMANAL SUGERIDO:**

### **Semana 1-2: Aprendizaje**
- **Todos:** Tutorial básico PHP + MySQL
- **Persona 1:** Aprender Docker básico
- **Persona 2:** Aprender Bootstrap
- **Persona 3:** Aprender autenticación PHP
- **Persona 4:** Aprender Canvas JavaScript + WebSockets básico

### **Semana 3-4: Prototipo**
- Persona 1: Docker + Laravel funcionando
- Persona 2: Páginas HTML de login y menú
- Persona 3: Registro/login funcionando
- Persona 4: Juego Pong básico en Canvas

### **Semana 5-6: Integración**
- Conectar todo: juego + usuarios + base de datos
- Implementar chat
- Mejorar diseño

### **Semana 7-8: Módulos extra**
- Añadir OAuth, gamificación, AI bot, etc.
- Testing y pulir detalles

---

## 🎯 **PUNTOS ASEGURADOS CON ESTA DISTRIBUCIÓN:**

1. **Backend framework** (Laravel) = 1-2 puntos ✅
2. **User Management** = 2 puntos ✅  
3. **Web-based game** = 2 puntos ✅
4. **Real-time features** = 2 puntos ✅
5. **Docker** = requisito ✅
6. **Frontend responsive** = requisito ✅
7. **CSS Framework** = requisito ✅

**Total mínimo: 7+ puntos** (faltarían 7 puntos que sacáis con módulos más fáciles: OAuth, gamificación, chat, estadísticas, etc.)

---

## ❓ **¿QUIÉN SE ENCARGA DE QUÉ EN CONCRETO?**

```plaintext
PERSONA 1:
- docker-compose.yml
- Laravel instalación
- Conexión a MySQL
- Rutas principales (/login, /game, /profile)

PERSONA 2:
- index.html, login.html, game.html
- styles.css con Bootstrap
- Diseño responsive
- Canvas del juego (estructura HTML)

PERSONA 3:
- register.php, login.php
- Encriptación contraseñas
- profile.php (ver perfil)
- friends.php (sistema amigos)

PERSONA 4:
- game.js (lógica Pong en Canvas)
- websocket.php (Ratchet para tiempo real)
- chat.js (chat instantáneo)
- bot.js (IA para jugar solo)
```

---

