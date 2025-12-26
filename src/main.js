import { createApp } from "vue";
import { createPinia } from 'pinia'; // Pinia ya estaba en tus dependencias
import App from "./App.vue";
import router from './router'; // Importamos el router
import "./style.css";

// PrimeVue
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura'; 
import 'primeicons/primeicons.css'; // Iconos

const app = createApp(App);

app.use(createPinia()); // Activamos Pinia
app.use(router); // Activamos Router
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark',
        }
    }
});

app.mount("#app");