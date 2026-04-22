Este es un archivo md para organizarme todas mis tareas

## Qué modulos hacer para sumar 7 puntos?

- IA Rival + Backend as microservices(Python Flask) (2 + 2 points)  *

- Remote authentication with OAuth 2.0 (1 point)  *

- Monitoring system with Prometheus and Graphana (2 points) *

- Standard user management and authentication (2 points)

- Interacción de usuarios + advanced chat (3 points)


## Implementar IA rival

- Entrenar modelo y crear servidor

- Modificar Backend

- Servidor Python

- Integrar servicio en el compose


### Cambiar backend para implementar IA

- Usar barajas que se reinicien cada x rondas

- Hacer que al repartirse una carta ya no pueda volver a salir???


### Modelos

Entrenar modelos para:

- Mejor jugada

- Tamaño de apuesta


- Input para predecir tamaño de apuesta

	- Cartas restantes

	- Banca total


### Modelo Hit o stand

INPUT: cards_total, dealer_total y usable ace(bool)

OUTPUT: hit or stand

- 1 Entrenar modelo
	- Entender la parte necesaria del backend para entrenarlo con lo ya hecho?
	- Hacer un pipeline para pasarle esta info del backend al modelo en vez de usar un dataset

- 2 Comprobar modelo

- 3 Implementar modelo en partidas
	- Usar modelo para generar decisiones de la IA rival
	- Gestionar que la IA aparezca como un jugador de la mesa


**Flujo Backend**:

- 1. Añadir flag isAI al objeto player
- 2. Nueva función para añadir IA a la mesa (con espacio disponible)
- 3. Nueva función para eliminar IA
- 4. Modificar loop de turnos: si players[turn].isAI === true, ejecutar modelo ML en lugar de esperar input de socket
- 5. Reutilizar todo lo demás (hit, stand, calculateScore, deal, resolveWinners)

## Algoritmo DQN

- Hacerlo con pytorch desde scratch

## Microservicio

- Comunicación entre servicios vía HTTP
	- input: {player_value, dealer_value, ace}
	- output: {hit or stand}

- Gestionar timeout haciendo Stand


## Prometheus y Graphana

- 

