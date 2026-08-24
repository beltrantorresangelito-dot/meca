MECA F10.48 - CHARACTERIZATION MAIL RESIDUAL

HALLAZGO
server.js contiene un bloque residual de nodemailer dentro del callback HTTP:

- require('nodemailer')
- createTransport(...)
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS

PERO:
- no existe transporter.sendMail(...)
- no existe endpoint de correo
- no existe módulo mail/email
- el transporter se crea en cada request y nunca se usa

CONCLUSIÓN
El bloque es código muerto / documentación incrustada, no una funcionalidad activa.

RIESGOS DEL ESTADO ACTUAL
1. require('nodemailer') se evalúa al procesar requests.
2. createTransport se ejecuta por request.
3. usa fallbacks placeholder:
   tu-correo@gmail.com
   tu-contraseña
4. añade dependencia y ruido operacional sin beneficio.
5. podría provocar fallo en runtime si nodemailer no estuviera instalado.

ESTA FASE NO MODIFICA PRODUCCIÓN.

SIGUIENTE PROPUESTO
F10.49 - eliminar completamente el residual nodemailer de server.js
y proteger por tests que no quede require/createTransport/SMTP placeholder.

Si en el futuro MECA necesita correo, se implementará como módulo real:
MailService + configuración SMTP explícita, no reutilizando este bloque muerto.
