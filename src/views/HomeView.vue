<script setup>
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';

const router = useRouter();

const features = [
    { 
        icon: 'pi pi-database', 
        title: 'Supabase Ready', 
        desc: 'Cliente configurado y listo para autenticación y base de datos.' 
    },
    { 
        icon: 'pi pi-palette', 
        title: 'Tailwind CSS 4', 
        desc: 'Estilos modernos con el nuevo motor de Tailwind optimizado.' 
    },
    { 
        icon: 'pi pi-box', 
        title: 'PrimeVue 4', 
        desc: 'Suite completa de componentes UI con el tema Aura.' 
    },
    { 
        icon: 'pi pi-chart-line', 
        title: 'Visualización', 
        desc: 'Gráficas con Chart.js y reportes PDF integrados.' 
    }
];
</script>

<template>
    <div class="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12 animate-fade-in">
        
        <div class="space-y-6 max-w-3xl">
            <div class="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
                <i class="pi pi-bolt text-indigo-600 text-2xl"></i>
            </div>
            <h1 class="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                Vue 3 <span class="text-indigo-600">Enterprise</span> Boilerplate
            </h1>
            <p class="text-xl text-slate-600 leading-relaxed">
                Una base sólida y escalable para tus próximos proyectos. 
                Configurada con las mejores herramientas del ecosistema Vue.
            </p>
            
            <div class="flex justify-center gap-4 pt-4">
                <Button label="Ver Demo de Componentes" icon="pi pi-arrow-right" iconPos="right" size="large" 
                    @click="router.push('/demo')" />
                <Button label="Documentación" icon="pi pi-github" severity="secondary" outlined size="large" 
                    as="a" href="https://github.com" target="_blank" />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4">
            <div v-for="item in features" :key="item.title" 
                class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1 duration-300">
                <div class="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4 text-indigo-600">
                    <i :class="[item.icon, 'text-xl']"></i>
                </div>
                <h3 class="font-bold text-slate-800 mb-2">{{ item.title }}</h3>
                <p class="text-sm text-slate-500">{{ item.desc }}</p>
            </div>
        </div>

    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>