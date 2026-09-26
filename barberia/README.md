# Casa Navarro

Sitio público y panel de la barbería. Mobile first: una columna, la reserva fija al alcance del pulgar y la agenda como lista del día.

El sistema de pollo del repositorio no se toca. Esta app vive en `barberia/`.

## Preparar

```bash
cd barberia
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Abre `http://localhost:3000` en el ancho de un teléfono.

## Cuentas de demostración

Contraseña de las tres: `navarro123`

| Email | Rol |
| --- | --- |
| elena@casanavarro.test | Dueña, ve todo |
| mateo@casanavarro.test | Barbero, solo su agenda |
| luis@casanavarro.test | Barbero, solo su agenda |

Para probar el corte gratis, reserva con el teléfono `71234567` (Valeria Rojas).

## Qué queda para después

Google Calendar está descrito en el perfil del panel y el modelo guarda `googleEventId`, pero el OAuth no se conecta hasta tener credenciales de Google. El QR es una imagen que la dueña reemplaza en Configuración; no hay pasarela de pago.
