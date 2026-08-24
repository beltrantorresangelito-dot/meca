MECA F10.49 - ELIMINACIÓN RESIDUAL NODEMAILER

OBJETIVO
Eliminar código muerto de correo incrustado en server.js.

ELIMINADO
- require('nodemailer')
- nodemailer.createTransport(...)
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- placeholders:
  tu-correo@gmail.com
  tu-contraseña
- comentarios de instalación nodemailer

JUSTIFICACIÓN
F10.48 confirmó que:
- no existía transporter.sendMail(...)
- no existía endpoint mail/email/correo
- el transporter se creaba por request y nunca se utilizaba

POR TANTO
No se modulariza: se elimina como código muerto.

NO CAMBIA
- vistas HTML
- rutas API
- módulos cerrados
- lógica productiva activa

VALIDACIONES
- node --check server.js
- tests del residual
- regresión Generic RPC / Generic Query / Audio Proxy

SIGUIENTE
Inventariar residuos restantes de server.js.
