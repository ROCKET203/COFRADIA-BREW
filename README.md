# Cofradía Brew · finanzas

App web para la barra móvil de café y matcha: inventario, eventos y ganancia real por evento.
HTML + CSS + JavaScript puro, sin dependencias ni build. Funciona en GitHub Pages.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura (login, resumen, inventario, eventos, datos) |
| `styles.css` | Estilos |
| `app.js` | Toda la lógica y el almacenamiento |
| `server.js` | Solo para probar en tu compu: `node server.js` → http://localhost:4173 |

## Qué incluye

- **Inventario**: café, leche, matcha, syrups, otros. Stock, stock mínimo, costo unitario y unidad (g / ml / u). Se edita en la tabla y se guarda solo.
- **Eventos**: nombre, fecha, lugar y cobro al cliente.
- **Detalle por evento**: insumos usados (descuenta stock automáticamente y lo devuelve si lo borras) + gastos extra (transporte, meseros, hielo…).
- **Ganancia**: ingreso − (insumos + gastos extra), en el evento y en el resumen general.
- **Resumen**: ingresos, gastos, ganancia y alerta de stock bajo.
- **Datos**: exportar / importar JSON y borrar todo.

Todo el dinero se muestra en **dólares**. Si algún día cambias de moneda, es una línea en `app.js`:
`const CURRENCY = '$';`

## Accesos (3 personas)

Los códigos están en `app.js`, en la constante `USERS`:

| Usuario | Código inicial |
|---|---|
| Rodrigo | `cafe4821` |
| Socio 2 | `matcha7365` |
| Socio 3 | `syrup9104` |

Cámbialos antes de publicar. El archivo guarda el **hash** del código, no el código.
Para generar uno nuevo, con Node instalado:

```powershell
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('cofradia-brew|TU_CODIGO_NUEVO').digest('hex'))"
```

Copia el resultado en el `hash` del usuario correspondiente (también puedes cambiar el `name`).
La sesión vive en `sessionStorage`: al cerrar el navegador se pide el código otra vez.

> **Ojo con la seguridad.** Un sitio estático no puede proteger datos de verdad: el código es visible
> para quien abra el repositorio y un código corto se puede adivinar. Sirve como "cerradura de la puerta".
> Si necesitas candado real (y datos compartidos), usa **Cloudflare Access** (gratis hasta 50 usuarios)
> delante de Cloudflare Pages, o un backend pequeño tipo Supabase.

## Dónde se guardan los datos

En el `localStorage` **de cada navegador**. Es decir: cada persona ve sus propios datos, y si borras
datos del navegador se pierden. Por eso:

1. Usen **un solo dispositivo** (la tablet/laptop del negocio) para llevar todo, o
2. Exporten el JSON al terminar cada evento y lo importen en el otro equipo.

Si quieren que los 3 vean los mismos datos en tiempo real, hay que agregar una base de datos
(Supabase free es la vía corta: 2 tablas, `inventory` y `events`).

## Subirlo a GitHub Pages (paso a paso)

1. Crea un repositorio **público** en GitHub, por ejemplo `cofradia-brew`.
2. En esta carpeta (mejor cópiala fuera de OneDrive, ej. `C:\dev\cofradia-brew`, para evitar conflictos de sincronización):

```powershell
cd "C:\dev\cofradia-brew"
git init
git add .
git commit -m "Cofradia Brew finanzas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cofradia-brew.git
git push -u origin main
```

3. En GitHub: **Settings → Pages**.
4. En *Source* elige **Deploy from a branch**, *Branch*: `main`, carpeta `/ (root)` y **Save**.
5. Espera 1–2 minutos. Tu enlace queda en:

```
https://TU_USUARIO.github.io/cofradia-brew/
```

Ese es el enlace que compartes con las otras 2 personas.

Para actualizar después de un cambio:

```powershell
git add .
git commit -m "cambios"
git push
```

GitHub Pages publica solo en la rama `main`; no pongas contraseñas reales en el repo.

## Ideas para después (fáciles de agregar)

- Gastos fijos mensuales (renta, permisos) para una ganancia neta real.
- Recetas por bebida: registrar "12 matcha lattes" y que descuente insumos automáticamente.
- Comparar precio cobrado vs. costo para saber el margen por evento.
