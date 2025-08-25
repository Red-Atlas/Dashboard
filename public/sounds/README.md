# Sonidos de Notificación

## Cómo agregar los sonidos de notificación:

### 1. Sonido de Nueva Transacción (`notification.mp3`):
- **Descarga un sonido de notificación** (formato MP3):
  - Puedes usar sitios como: https://notificationsounds.com/
  - O buscar "notification sound mp3" en Google
  - Recomendado: sonido corto (1-3 segundos) y profesional

- **Renombra el archivo** a `notification.mp3`
- **Colócalo en esta carpeta** (`public/sounds/notification.mp3`)

### 2. Sonido de Inactividad (`crickets.mp3`):
- **Descarga un sonido de grillos/silencio** (formato MP3):
  - Puedes buscar "crickets sound mp3" o "silence sound mp3"
  - Recomendado: sonido de grillos o silencio (2-5 segundos)
  - Sitios recomendados: https://freesound.org/search/?q=crickets

- **Renombra el archivo** a `crickets.mp3`
- **Colócalo en esta carpeta** (`public/sounds/crickets.mp3`)

### 3. Sonido de Pérdida de Suscripción (`fail.mp3`):
- **Descarga un sonido de error/fallo** (formato MP3):
  - Puedes buscar "fail sound mp3" o "error sound mp3"
  - Recomendado: sonido de error o fallo (1-3 segundos)
  - Sitios recomendados: https://freesound.org/search/?q=fail

- **Renombra el archivo** a `fail.mp3`
- **Colócalo en esta carpeta** (`public/sounds/fail.mp3`)

## Características recomendadas de los sonidos:
- **notification.mp3**: Duración 1-3 segundos, tono profesional y agradable
- **crickets.mp3**: Duración 2-5 segundos, sonido de grillos o silencio
- **fail.mp3**: Duración 1-3 segundos, tono de error o fallo

## Ejemplo de URLs para descargar sonidos:
- https://notificationsounds.com/notification-sounds
- https://mixkit.co/free-sound-effects/notification/
- https://freesound.org/search/?q=notification
- https://freesound.org/search/?q=crickets
- https://freesound.org/search/?q=fail

## Nota:
- `notification.mp3` se reproduce cuando llega una nueva transacción
- `crickets.mp3` se reproduce cuando pasan 30 minutos sin nuevas transacciones
- `fail.mp3` se reproduce cuando se pierde una suscripción activa
