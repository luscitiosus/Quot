# Calculadora de penas · Código Penal español

Aplicación web para calcular la pena aplicable a uno o varios delitos según el Código Penal español (LO 10/1995, texto consolidado vigente, incluida la reforma de la LO 1/2026, de 8 de abril).

Todos los archivos están en la raíz del proyecto, sin subcarpetas. El servidor es Node.js puro, sin dependencias.

## Qué calcula

- **Catálogo de 42 delitos y 228 modalidades** (tipos básicos, agravados y atenuados), con las penas comprobadas contra el texto consolidado del BOE (BOE-A-1995-25444): homicidio, asesinato, imprudencias, lesiones, violencia de género, detenciones, amenazas, coacciones, acoso, trata, delitos sexuales, intimidad, honor, familia, hurto, robo, estafa, apropiación indebida, daños, receptación, blanqueo, delito fiscal, drogas, seguridad vial, falsedades, delitos de funcionarios, justicia y orden público.
- **Grado de ejecución**: tentativa y actos preparatorios, inferior en uno o dos grados (arts. 16-18 y 62).
- **Participación**: autoría, inducción, cooperación necesaria, complicidad (art. 63) y extraneus (art. 65.3).
- **Eximentes incompletas** (art. 68) y **error de prohibición vencible** (art. 14.3).
- **Circunstancias** atenuantes (art. 21), agravantes (art. 22), mixta de parentesco (art. 23), atenuantes muy cualificadas y multirreincidencia, con todas las reglas del **art. 66** (incluida la compensación de la regla 7ª y el art. 66.2 para delitos leves e imprudentes).
- **Pena superior e inferior en grado y mitades** (art. 70), con los topes del art. 70.3 y la regla de la prisión permanente revisable (art. 70.4).
- **Delito continuado y delito masa** (art. 74).
- **Concursos**: real (arts. 73 y 75), ideal y medial (art. 77), con el **límite de cumplimiento del art. 76** (triple de la más grave; 20, 25, 30 o 40 años) y la advertencia del art. 78.
- **Multa por días-cuota** (arts. 50 y 53): importe total y responsabilidad personal subsidiaria; multa proporcional.
- **Clasificación** del delito y de la pena (arts. 13 y 33), **prescripción** del delito y de la pena (arts. 131 y 133), **cancelación de antecedentes** (art. 136) y **penas accesorias** (arts. 55 y 56).
- **Ejecución**: sustitución obligatoria de la prisión inferior a 3 meses (art. 71.2), suspensión ordinaria, excepcional, por drogodependencia y por enfermedad (art. 80), expulsión de extranjeros (art. 89), libertad condicional y periodo de seguridad con fechas estimadas (arts. 36.2 y 90), con abono de preventiva.
- **Calculadora rápida de grados** para cualquier marco penal.

El cómputo usa meses de 30 días y años de 360 (art. 50.4). Es una herramienta orientativa: la individualización final corresponde al tribunal.

## Archivos

| Archivo | Función |
|---|---|
| `index.html` | Interfaz |
| `styles.css` | Estilos (tema claro y oscuro, adaptado a móvil, impresión) |
| `app.js` | Lógica de la interfaz |
| `motor.js` | Motor de cálculo penológico (funciona en navegador y en Node) |
| `delitos.js` | Catálogo de delitos y marcos penales |
| `server.js` | Servidor HTTP sin dependencias |
| `test.js` | Pruebas del motor (`npm test`) |
| `package.json` | Scripts y versión de Node |
| `render.yaml` | Configuración para Render (Blueprint) |

## Probar en local

Requiere Node.js 18 o superior.

```bash
npm start          # http://localhost:3000
npm test           # 28 pruebas del motor
```

## Subir a GitHub

1. Crea un repositorio vacío en GitHub (por ejemplo `calculadora-penas`).
2. Descomprime el zip en una carpeta y, desde ella:

```bash
git init
git add .
git commit -m "Calculadora de penas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/calculadora-penas.git
git push -u origin main
```

También puedes usar «Add file → Upload files» en la web de GitHub y arrastrar todos los archivos.

## Desplegar en Render

**Opción A: Blueprint (usa `render.yaml`)**

1. En [dashboard.render.com](https://dashboard.render.com) pulsa **New → Blueprint**.
2. Conecta tu cuenta de GitHub y elige el repositorio.
3. Render lee `render.yaml` y crea el servicio web `calculadora-penas` en el plan gratuito. Pulsa **Apply**.

**Opción B: Web Service manual**

1. **New → Web Service** y elige el repositorio.
2. Configura:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
   - **Health Check Path** (en Advanced): `/health`
3. Pulsa **Create Web Service**. En uno o dos minutos tendrás la URL `https://calculadora-penas.onrender.com` (o similar).

Render asigna el puerto con la variable `PORT`, que el servidor ya respeta. En el plan gratuito el servicio se duerme tras 15 minutos sin visitas y tarda unos segundos en despertar.

## Ampliar el catálogo

Cada delito de `delitos.js` tiene modalidades con sus penas. Ejemplo:

```js
m('234.1', '234.1', 'Hurto (más de 400 €)', [[pr('6m', '18m')]])
```

Las penas se agrupan en listas: cada grupo se impone conjuntamente y, dentro de un grupo, las penas son alternativas (`[[pr('3m','3a'), mu('6m','12m')]]` es «prisión de 3 meses a 3 años o multa de 6 a 12 meses»). Las modalidades derivadas pueden calcularse con `d(id, art, nombre, base, operación)`, donde la operación es un número de grados (`1`, `-1`, `2`…) o `'mitadSuperior'` / `'mitadInferior'`. Ejecuta `npm test` tras cualquier cambio.

## Aviso

Calculadora orientativa. No sustituye el asesoramiento jurídico profesional. Contraste siempre con el texto vigente del Código Penal y con la jurisprudencia aplicable.
