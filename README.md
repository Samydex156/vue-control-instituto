# 🚀 Vue 3 Enterprise Boilerplate

Una plantilla profesional y moderna para aplicaciones web escalables, pre-configurada con **Vue 3, Vite, Tailwind CSS 4 y PrimeVue 4**.

Este starter kit incluye todo lo necesario para comenzar proyectos robustos (como ERPs, Dashboards o CRMs) sin perder tiempo configurando herramientas.

## 🛠 Tech Stack & Características

Esta plantilla combina las herramientas más potentes del ecosistema Vue:

* **Core:** [Vue 3](https://vuejs.org/) (Script Setup) + [Vite](https://vitejs.dev/)
* **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) + [PrimeVue v4](https://primevue.org/) (Tema Aura)
* **Navegación:** [Vue Router 4](https://router.vuejs.org/) (Configurado con Lazy Loading)
* **Estado:** [Pinia](https://pinia.vuejs.org/) (Gestión de estado modular)
* **Backend & Auth:** [Supabase JS](https://supabase.com/) (Cliente listo para usar)
* **Utilidades:**
    * `@vueuse/core` - Colección de composables esenciales.
    * `date-fns` - Manipulación de fechas.
    * `lodash-es` - Utilidades de JavaScript (Tree-shakable).
* **Visualización & Reportes:**
    * `chart.js` (vía PrimeVue) - Gráficas integradas.
    * `jspdf` + `jspdf-autotable` - Generación de reportes PDF.
    * `xlsx` - Exportación a Excel.

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura escalable basada en vistas y layouts:

```text
src/
├── assets/          # Recursos estáticos (Imágenes, Fuentes)
├── components/      # Componentes UI reutilizables (Átomos/Moléculas)
├── layouts/         # Plantillas base (ej: DashboardLayout, AuthLayout)
├── lib/             # Configuraciones de clientes (Supabase, Axios, etc)
├── router/          # Definición de rutas y guardianes
├── stores/          # Stores de Pinia
├── views/           # Páginas completas (Vistas)
├── App.vue          # Punto de entrada
└── main.js          # Configuración global y plugins