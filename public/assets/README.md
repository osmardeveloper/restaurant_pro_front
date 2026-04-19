# 🍽️ La Perla Restaurante - Assets

## Logo para el Menú Público

### 📋 Instrucciones Importantes

El menú público (`/menu`) ahora utiliza el logo de "La Perla Restaurante" de dos formas:

#### 1. **Logo Miniatura en Header (80x80px)**
- Ubicación: Parte superior del menú
- Mostrado en círculo con efecto glassmorphism
- Se redimensiona automáticamente en mobile

#### 2. **Marca de Agua en Fondo (Mobile)**
- Solo visible en dispositivos móviles (max-width: 600px)
- Usa la MISMA imagen del logo
- Transparencia: 8% (muy sutil)
- No interfiere con la lectura del contenido

---

## ⚙️ **PASO A PASO - Cómo Configurar**

### Paso 1: Guardar la imagen del logo

**Ubicación exacta:**
```
/frontend/public/assets/logo-perla.png
```

**Requisitos de la imagen:**
- Formato: PNG (recomendado para transparencia)
- Tamaño recomendado: 500x500px o mayor
- Proporción: Cuadrada (1:1) para mejor visualización
- Fondo: Transparente (PNG) o blanco

### Paso 2: ¡Listo!

El sistema cargará automáticamente:
- ✅ Logo miniatura en el header
- ✅ Marca de agua en móvil como fondo
- ✅ Responsive en todos los dispositivos

---

## 📁 Estructura de Carpetas Actual

```
restaurant-app/
├── frontend/
│   ├── public/
│   │   └── assets/                    ← SU CARPETA
│   │       ├── logo-perla.png        ← GUARDAR AQUÍ
│   │       └── README.md             ← Este archivo
│   └── src/
│       └── pages/
│           ├── PublicMenuPage.jsx     ← Componente principal
│           └── PublicMenuPage.css     ← Estilos
```

---

## 🎨 Personalización

### Cambiar tamaño del logo en header
Edita `PublicMenuPage.jsx`:
```jsx
// Busca esta línea en el header y cambiar width/height:
<Box sx={{ width: 80, height: 80, ... }}>
// Cambia 80 a otro valor, ej: 100, 120, etc.
```

### Ajustar transparencia de marca de agua
En `PublicMenuPage.jsx`, en el Box principal, cambia:
```jsx
opacity: 0.08,  // Cambiar 0.08 a 0.05, 0.10, etc.
```

### Cambiar tamaño de marca de agua
En `PublicMenuPage.jsx`, en el Box principal:
```jsx
width: 250,   // Cambiar a otro valor
height: 250,  // Cambiar a otro valor
```

### Cambiar punto de aparición (mobile/desktop)
En `PublicMenuPage.jsx`:
```jsx
'@media (max-width: 600px)': {  // Cambiar 600 a otro breakpoint
```

---

## ✅ Checklist de Configuración

- [ ] Imagen del logo guardada en `/frontend/public/assets/logo-perla.png`
- [ ] Imagen es PNG con fondo transparente (recomendado)
- [ ] Imagen es por lo menos 500x500px
- [ ] Se visualiza correctamente en `/menu`
- [ ] Se ve marca de agua al acceder con dispositivo móvil
- [ ] Logo miniatura es visible en header

---

## 🐛 Solución de Problemas

**El logo no aparece en header:**
- Verificar que la imagen está en `/frontend/public/assets/logo-perla.png`
- Verificar nombre exacto: `logo-perla.png` (minúsculas)
- Verificar que es PNG o JPG (no SVG)
- Limpiar caché del navegador (Ctrl+Shift+Delete)

**La marca de agua no se ve en mobile:**
- Acceder con device móvil real o DevTools de navegador (F12)
- Verificar que la viewport es menor a 600px
- Comprobar que `opacity: 0.08` no es muy baja

**La imagen se ve pixelada:**
- Usar imagen de mayor resolución (mínimo 500x500px)
- Verificar que `objectFit: 'contain'` esté en el img

---

## 🎯 Resultado Final

✨ **Menú público con:**
- Logo miniatura 80x80px en header circular
- Marca de agua del mismo logo de fondo en móvil
- Colores coordinados (azul marino + rosa acento)
- Totalmente responsive
- Mobile-first design

---

**¿Preguntas?** Revisa `PublicMenuPage.jsx` para ver toda la implementación.

