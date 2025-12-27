<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isSidebarOpen = ref(true);

const items = [
    { label: 'Inicio', icon: 'pi pi-home', route: '/' },
    { label: 'Inscripción', icon: 'pi pi-user-plus', route: '/inscripcion' },
    { label: 'Registrar Pago', icon: 'pi pi-credit-card', route: '/pagos' },
    { label: 'Crear Curso', icon: 'pi pi-desktop', route: '/nuevo-curso' },
    { label: 'Registro Estudiantil', icon: 'pi pi-cog', route: '/registros' },
    { label: 'Monitor Asistencia', icon: 'pi pi-desktop', route: '/monitor-asistencia' }
];

const navigate = (item) => {
    if (item.route) router.push(item.route);
    if (item.url) window.open(item.url, '_blank');
};
</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden">

        <aside
            :class="['bg-white border-r border-slate-200 transition-all duration-300 flex flex-col', isSidebarOpen ? 'w-64' : 'w-20']">
            <div class="h-16 flex items-center justify-center border-b border-slate-100">
                <i class="pi pi-box text-indigo-600 text-2xl"></i>
                <span v-if="isSidebarOpen" class="ml-2 font-bold text-slate-800">VueBase</span>
            </div>

            <nav class="flex-1 p-4 space-y-2">
                <button v-for="item in items" :key="item.label" @click="navigate(item)"
                    class="w-full flex items-center p-3 rounded-lg hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors">
                    <i :class="[item.icon, 'text-lg']"></i>
                    <span v-if="isSidebarOpen" class="ml-3 font-medium">{{ item.label }}</span>
                </button>
            </nav>
        </aside>

        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <header class="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-6">
                <button @click="isSidebarOpen = !isSidebarOpen" class="text-slate-500 hover:text-indigo-600">
                    <i class="pi pi-bars text-xl"></i>
                </button>
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-600">Admin User</span>
                    <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <i class="pi pi-user"></i>
                    </div>
                </div>
            </header>

            <main class="flex-1 overflow-auto p-6">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </main>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>