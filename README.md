# 42-ft-Transcender


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
