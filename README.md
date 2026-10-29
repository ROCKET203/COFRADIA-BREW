# Cofradía Brew · finanzas

App web para la barra móvil de café y matcha: inventario, eventos y ganancia real por evento.
HTML + CSS + JavaScript puro. Los datos se guardan en **Supabase** (Postgres + Auth), así que
los 3 usuarios ven la misma información desde cualquier dispositivo.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura (login, resumen, inventario, eventos, datos) |
| `styles.css` | Estilos |
| `app.js` | Lógica + conexión a Supabase |
| `supabase/schema.sql` | Tablas, seguridad (RLS) e inventario inicial |
| `server.js` | Solo para probar en tu compu: `node server.js` → http://localhost:4173 |

## Qué incluye

- **Inventario**: café, leche, matcha, syrups, otros. Stock, stock mínimo, costo unitario y unidad (g / ml / u). Se edita en la tabla y se guarda solo.
- **Eventos**: nombre, fecha, lugar y cobro al cliente.
- **Detalle por evento**: insumos usados (descuenta stock y lo devuelve si borras la línea) + gastos extra.
- **Ganancia**: cobro − (insumos + extras), en el evento, en la tabla y en el resumen.
- **Resumen**: ingresos, gastos, ganancia y alerta de stock bajo.
- **Datos**: exportar / importar JSON y vaciar la base.
- Todo el dinero en **dólares** (`const CURRENCY = '$'` en `app.js` si algún día cambia).

## Configurar Supabase (una sola vez)

1. Crea una cuenta en `https://supabase.com` y un proyecto nuevo (plan free). Guarda la contraseña de la base.
2. En el proyecto: **SQL Editor → New query** → pega todo el contenido de `supabase/schema.sql` → **Run**.
   Eso crea las tablas `inventory` y `events`, deja la seguridad activada (solo usuarios con sesión)
   y carga 7 insumos de ejemplo.
3. **Authentication → Users → Add user → Create new user**: crea los 3 usuarios con correo y contraseña.
   Marca *Auto Confirm User* para que puedan entrar de inmediato. (Opcional: en *User Metadata*
   pon `{"name":"Rodrigo"}` para que el saludo use ese nombre.)
4. **Project Settings → API**: copia `Project URL` y la llave `anon public`.
5. En `app.js`, líneas 13-14:

```js
const SUPABASE_URL = 'https://tuproyecto.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOi...';   // anon public
```

6. Verifica que los 3 correos estén en *Authentication → Providers → Email* habilitado
   (lo está por defecto). Si más adelante activas "Confirm email", avísame porque cambia el flujo.

Una vez configurado, quien abra el enlace sin cuenta solo ve la pantalla de login: la base
rechaza cualquier lectura sin sesión gracias a las políticas RLS del `schema.sql`.

## Datos compartidos

- Los 3 usuarios ven lo mismo. La app recarga al volver a la pestaña y con el botón **Actualizar**.
- Si dos personas editan el mismo insumo al mismo tiempo, gana el último guardado.
- El respaldo (`Exportar JSON`) sí es por navegador: úsalo para tener copia fuera de Supabase.

## Subirlo a GitHub Pages

Repo: `https://github.com/ROCKET203/COFRADIA-BREW` (público) · rama `main` · carpeta `/ (root)`.

```powershell
cd "C:\dev\cofradia-brew"
git add -A
git commit -m "descripcion del cambio"
git push
```

Espera 1–2 minutos y refresca con **Ctrl + Shift + R**.
Enlace: `https://rocket203.github.io/COFRADIA-BREW/`

## Problemas comunes

| Síntoma | Causa / arreglo |
|---|---|
| "Falta configurar SUPABASE_URL y SUPABASE_KEY" | Faltan las 2 líneas del paso 5 |
| "Correo o contraseña incorrectos" con la clave correcta | Usuario sin confirmar (Authentication → Users) |
| "No se pudieron cargar los datos: permission denied" | Falta correr el `schema.sql` (políticas RLS) |
| Los otros no ven mis cambios | Toca **Actualizar** o cambia de pestaña y vuelve |
| 404 en el enlace | Pages debe estar en `main` + `/ (root)` |
