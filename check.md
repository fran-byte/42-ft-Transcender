

# 📝 Checklist de Evaluación — Proyecto ft_transcender

## 1. Directrices Generales
-  Repositorio Git pertenece al equipo evaluado  
- Solo se evalúa lo que está en el repositorio  
- Revisión cuidadosa de cada paso  
- Proyecto debe alcanzar **mínimo 14 puntos de módulos**  
- Todos los miembros del equipo presentes  
- `git clone` hecho en carpeta vacía  
- No existen alias maliciosos  
- Revisar scripts usados para pruebas/automatización  
- Evaluador ha leído toda la materia  
- Usar banderas para: repositorio vacío, programa que no funciona, error de Norm, trampas  
- En caso de trampa → nota final = **-42**  
- En caso de fallo técnico → nota final = **0**

---

## 2. Preliminares

### Presencia del equipo
- [☑️] Todos los miembros (4–5) están presentes

### Contribuciones individuales
Para **cada miembro**:
- [ ] Explica su rol (PO, PM, Tech Lead, Dev)  
- [ ] Explica sus contribuciones  
- [ ] Explica al menos una función/módulo implementado por él/ella  
- [ ] Demuestra comprensión real del proyecto

### Verificación del README.md
- [ ] Nombre y descripción del proyecto  
- [ ] Miembros + roles  
- [ ] Enfoque de gestión del proyecto  
- [ ] Tecnologías usadas + justificación  
- [ ] Esquema de base de datos  
- [ ] Lista de features + quién las implementó  
- [ ] Módulos elegidos + justificación + cálculo de puntos  
- [ ] Contribuciones individuales  
- [ ] README completo y coherente

### Coherencia del proyecto
Dos miembros deben explicar:
- [ ] Concepto del proyecto  
- [ ] Tecnologías principales y por qué  
- [ ] Cómo se coordinó el equipo  
- [ ] Explicaciones coherentes entre miembros

### Historia de Git
- [☑️] Commits de todos los miembros  
- [☑️] Mensajes claros y significativos  
- [☑️] Distribución real del trabajo  
- [ ] Historial mostrado por un miembro

---

## 3. Requisitos Generales

### Componentes arquitectónicos
- [☑️] Frontend presente y funcional  
- [☑️] Backend presente y funcional  
- [☑️] Base de datos presente y funcional  

### Despliegue
- [☑️] Despliegue con contenedores (Docker/Podman)  
- [☑️] Un solo comando  
- [☑️] Todos los servicios arrancan correctamente  
- [☑️] Aplicación accesible

### Compatibilidad de navegador
- [☑️] Funciona en Chrome estable  
- [?] Sin errores en consola  
- [?] Advertencias menores justificadas

### Política de privacidad y TOS
- [☑️] Ambas páginas accesibles  
- [☑️] Contenido relevante  
- [☑️] No son placeholders  
- [?] Ausencia → rechazo del proyecto

---

## 4. Requisitos Técnicos

### Frontend
- [☑️] UI clara y responsiva  
- [☑️] Funciona en escritorio y móvil

### Estilismo
- [☑️] Uso de framework CSS (Tailwind, Bootstrap, MUI, etc.)  
- [?] Demostración en código

### Variables de entorno
- [☑️] `.env` existe  
- [?] `.env` está en `.gitignore`  
- [☑️] No hay credenciales sensibles en el repo, Si hay credenciales → **fallo inmediato**

### Diseño de base de datos
- [ ] Esquema claro  
- [ ] Relaciones bien definidas  
- [ ] Explicación por un miembro

### Seguridad de autenticación
- [☑️] Registro/login con email + contraseña  
- [☑️] Contraseñas hasheadas + saladas  
- [☑️] No se almacenan en texto plano  
- [ ] Equipo explica hashing/salting

### Validación de formularios
- [ ] Validación en frontend  
- [ ] Validación en backend  
- [ ] Pruebas con inputs inválidos  
- [?] Protección contra SQLi, XSS, etc.

### Conexiones seguras
- [☑️] Backend accesible solo por HTTPS

---

## 5. Verificación de Módulos

### Puntos de módulo
- [ ] Lista de módulos en README  
- [ ] Cálculo correcto  
- [ ] Total ≥ 14 puntos antes de validar

### Módulos principales (2 puntos)
Para cada uno:
- [ ] Demostrado  
- [ ] Funciona completamente  
- [ ] Cumple requisitos del PDF  
- [ ] Aporta valor real  
- [ ] Dependencias cumplidas  
- [ ] Si no funciona → **0 puntos**

### Módulos menores (1 punto)
Para cada uno:
- [ ] Demostrado  
- [ ] Funciona completamente  
- [ ] Aporta valor  
- [ ] Dependencias cumplidas  
- [ ] Si no funciona → **0 puntos**

### Módulos personalizados
- [ ] Justificación en README  
- [ ] Complejidad técnica real  
- [ ] No es trivial  
- [ ] Relevante para el proyecto  
- [ ] Funciona correctamente

---

## 6. Calidad del Código

### Estructura
- [ ] Carpetas limpias y organizadas  
- [ ] Código legible  
- [ ] Estilo consistente  
- [ ] Sin problemas graves

### Decisiones técnicas
Equipo debe explicar:
- [ ] Elección de la stack  
- [ ] Arquitectura  
- [ ] Retos y soluciones  
- [ ] Compensaciones técnicas

### Trabajo en equipo
- [ ] Todos contribuyeron  
- [ ] Pueden explicar el trabajo de otros  
- [ ] Trabajo coordinado  
- [ ] README refleja distribución  
- [ ] No hay “one-man project”

---

## 7. Funcionalidad

### Estabilidad
- [ ] Sin errores críticos  
- [ ] Features principales funcionan  
- [ ] Manejo básico de errores  
- [ ] UX aceptable  
- [ ] Multiusuario funcional

### Calidad general
- [ ] Demuestra aprendizaje  
- [ ] Va más allá del mínimo  
- [ ] Uso de nuevas tecnologías  
- [ ] Creatividad  
- [ ] Concepto bien ejecutado

---

## 8. Verificación Final

### Recuento final de módulos
- [ ] Solo contar módulos demostrados  
- [ ] Módulos principales = 2 puntos  
- [ ] Módulos menores = 1 punto  
- [ ] Módulos incompletos = 0 puntos  
- [ ] Total validado ≥ 14 puntos

### Éxito del proyecto
- [ ] Parte obligatoria completa  
- [ ] Todos contribuyeron  
- [ ] Equipo puede explicar decisiones  
- [ ] Cumple requisitos de la materia  
- [ ] README completo  
- [ ] Proyecto considerado exitoso

---

## 9. Bonificaciones (solo si TODO lo obligatorio está perfecto)

### Módulos extra
Para cada módulo extra:
- [ ] Funciona perfectamente  
- [ ] Cumple requisitos del PDF  
- [ ] Aporta valor  
- [ ] Justificado en README  

### Puntuación extra
- [ ] 0 → sin módulos extra  
- [ ] 1 → 1 menor  
- [ ] 2 → 1 mayor o 2 menores  
- [ ] 3 → 1 mayor + 1 menor o 3 menores  
- [ ] 4 → 2 mayores  
- [ ] 5 → excelencia (máximo)

---

