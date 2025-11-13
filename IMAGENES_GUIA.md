# Guía de Imágenes para KLOB

## Imagen Hero (Fondo Principal)

Coloca la imagen de fondo horizontal para el Hero Section en la carpeta `/client/public/images/`:

- `beach-hero.jpg` - Imagen horizontal de playa/paisaje para el fondo del Hero Section

**Recomendaciones:**
- Formato: JPG o PNG
- Tamaño recomendado: mínimo 1920x1080px (formato horizontal/landscape)
- La imagen se mostrará como fondo completo del Hero Section
- Si la imagen no está disponible, se mostrará un gradiente automáticamente

## Logos de Empresas

Coloca los logos de las empresas en la carpeta `/client/public/logos/` con los siguientes nombres:

- `trucco.svg` - Logo de Trucco (ya creado)
- `naelle.svg` - Logo de Naelle (ya creado)
- `byniumaal.svg` - Logo de Byniumaal (ya creado)
- `cinzia-cortesi.svg` - Logo de Cinzia Cortesi (ya creado)

**Nota:** Los logos SVG ya están creados y se muestran a color (no en escala de grises). Los nombres de las empresas no se muestran ya que están incluidos en los logos.

## Imágenes de Antes/Después (Collage)

Coloca las imágenes para el collage del "Antes" en la carpeta `/client/public/images/`:

- `before-1.jpg` - Primera imagen del collage (ej: persona trabajando en Excel)
- `before-2.jpg` - Segunda imagen del collage (ej: productos sin vender, stock desordenado)
- `before-3.jpg` - Tercera imagen del collage (ej: roturas de stock, problemas)
- `before-4.jpg` - Cuarta imagen del collage (ej: trabajo manual, confusión)

**Recomendaciones:**
- Formato: JPG o PNG
- Tamaño recomendado: mínimo 400x300px cada una
- Las imágenes se mostrarán en un grid de 2x2 formando un collage visual
- Si las imágenes no están disponibles, se mostrarán gradientes de color automáticamente

## Estructura de Carpetas

```
client/public/
├── logos/
│   ├── trucco.png
│   ├── naelle.png
│   └── byniumaal.png
└── images/
    ├── before-klob.jpg
    └── after-klob.jpg
```

Si las imágenes no están disponibles, el sistema mostrará placeholders automáticamente.
