<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabaseClient.js'
//import dayjs from 'dayjs' // Recomendado para manejar fechas, o usa JS nativo

// PrimeVue Imports
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

const loading = ref(true)
const logs = ref([])
// Inicializar con la fecha local YYYY-MM-DD para evitar desfases de zona horaria (UTC vs Local)
const fechaFiltro = ref(new Date().toLocaleDateString('en-CA'))
const subscription = ref(null)

// --- ESTADÍSTICAS DEL DÍA ---
const stats = computed(() => {
    const total = logs.value.length
    const puntuales = logs.value.filter(l => l.estado === 'Asistencia').length
    const retrasos = logs.value.filter(l => l.estado === 'Retraso').length
    const deuda = logs.value.filter(l => l.pago_al_dia === false).length
    return { total, puntuales, retrasos, deuda }
})

// 1. CARGAR ASISTENCIAS
const fetchLogs = async () => {
    loading.value = true

    // Rango de fechas para el día seleccionado (00:00 a 23:59)
    const start = `${fechaFiltro.value} 00:00:00`
    const end = `${fechaFiltro.value} 23:59:59`

    const { data, error } = await supabase
        .from('registros_asistencia')
        .select(`
            id, 
            hora_entrada, 
            estado, 
            pago_al_dia,
            estudiantes ( id, nombre, apellido_paterno ),
            cursos ( id, nombre )
        `)
        .gte('hora_entrada', start)
        .lte('hora_entrada', end)
        .order('hora_entrada', { ascending: false }) // Los más recientes primero

    if (error) {
        console.error('Error en fetchLogs:', error)
        logs.value = []
    } else {
        logs.value = data
    }

    loading.value = false
}

// 2. ESCUCHAR CAMBIOS EN TIEMPO REAL
const suscribirCambios = () => {
    subscription.value = supabase
        .channel('asistencia-live')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'registros_asistencia' },
            (payload) => {
                // Cuando entra un registro nuevo, lo ideal es hacer fetch de nuevo
                // para traer los datos RELACIONADOS (nombre del estudiante),
                // ya que el payload solo trae el ID del estudiante.
                fetchLogs()
            }
        )
        .subscribe()
}

// Formatear hora (ej: 14:30)
const formatTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Observar cambio de fecha en el filtro
watch(fechaFiltro, () => {
    fetchLogs()
})

onMounted(() => {
    fetchLogs()
    suscribirCambios()
})

onUnmounted(() => {
    if (subscription.value) supabase.removeChannel(subscription.value)
})
</script>

<template>
    <div class="p-6 bg-slate-50 min-h-screen">
        <div class="max-w-6xl mx-auto space-y-6">

            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <i class="pi pi-clock text-indigo-600"></i>
                        Monitor de Ingresos
                    </h1>
                    <p class="text-slate-500 text-sm">Registro de asistencia en tiempo real</p>
                </div>

                <div class="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                    <span class="text-sm font-semibold text-slate-600 pl-2">Fecha:</span>
                    <input type="date" v-model="fechaFiltro"
                        class="border-none focus:ring-0 text-slate-700 font-medium bg-transparent" />
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold">Total Hoy</p>
                        <p class="text-2xl font-bold text-slate-800">{{ stats.total }}</p>
                    </div>
                    <div class="bg-blue-50 p-2 rounded-full text-blue-600">
                        <i class="pi pi-users text-xl"></i>
                    </div>
                </div>

                <div
                    class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold">Puntuales</p>
                        <p class="text-2xl font-bold text-emerald-600">{{ stats.puntuales }}</p>
                    </div>
                    <div class="bg-emerald-50 p-2 rounded-full text-emerald-600">
                        <i class="pi pi-check-circle text-xl"></i>
                    </div>
                </div>

                <div
                    class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold">Retrasos</p>
                        <p class="text-2xl font-bold text-orange-500">{{ stats.retrasos }}</p>
                    </div>
                    <div class="bg-orange-50 p-2 rounded-full text-orange-500">
                        <i class="pi pi-exclamation-circle text-xl"></i>
                    </div>
                </div>

                <div
                    class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold">Con Deuda</p>
                        <p class="text-2xl font-bold text-red-600">{{ stats.deuda }}</p>
                    </div>
                    <div class="bg-red-50 p-2 rounded-full text-red-600">
                        <i class="pi pi-wallet text-xl"></i>
                    </div>
                </div>
            </div>

            <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <DataTable :value="logs" :loading="loading" paginator :rows="10" tableStyle="min-width: 50rem">

                    <template #empty> No hay registros para esta fecha. </template>

                    <Column header="Hora" style="width: 10%">
                        <template #body="slotProps">
                            <span class="font-mono font-bold text-slate-700 text-lg">
                                {{ formatTime(slotProps.data.hora_entrada) }}
                            </span>
                        </template>
                    </Column>

                    <Column header="Estudiante / Curso">
                        <template #body="slotProps">
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-800">
                                    {{ slotProps.data.estudiantes?.nombre }} {{
                                        slotProps.data.estudiantes?.apellido_paterno }}
                                </span>
                                <div class="flex items-center gap-2 mt-1">
                                    <span
                                        class="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                        {{ slotProps.data.cursos?.nombre || 'Curso no especificado' }}
                                    </span>
                                    <span class="text-[9px] text-slate-400">ID: {{ slotProps.data.estudiantes?.id
                                        }}</span>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column header="Llegada" style="width: 15%">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.estado"
                                :severity="slotProps.data.estado === 'Asistencia' ? 'success' : 'warning'"
                                class="uppercase text-xs" />
                        </template>
                    </Column>

                    <Column header="Situación Pago" style="width: 15%">
                        <template #body="{ data }">
                            <div v-if="data.pago_al_dia"
                                class="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                                <i class="pi pi-check-circle"></i>
                                <span>Al día</span>
                            </div>
                            <div v-else
                                class="flex items-center gap-2 px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm font-bold border border-red-200 animate-pulse">
                                <i class="pi pi-ban"></i>
                                <span>DEBE PAGO</span>
                            </div>
                        </template>
                    </Column>

                </DataTable>
            </div>

        </div>
    </div>
</template>