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
const activeEnrollments = ref([])
const viewMode = ref('reporte') // 'reporte' (Inasistencias) o 'historial' (Solo marcaciones)

// Inicializar con la fecha local
const fechaFiltro = ref(new Date().toLocaleDateString('en-CA'))
const subscription = ref(null)

// --- HORARIOS ---
const HORA_INICIO = "09:00"
const TOLERANCIA = "09:15"
const LIMITE_RETRASO = "10:30"

// --- ESTADÍSTICAS DEL DÍA ---
const stats = computed(() => {
    const marcaciones = logs.value.length
    const puntuales = logs.value.filter(l => l.estado === 'Asistencia').length
    const retrasos = logs.value.filter(l => l.estado === 'Retraso').length
    const faltasHorario = logs.value.filter(l => l.estado === 'Falta').length

    // Calculamos inasistencias (quienes no han marcado hoy)
    const inasistencias = activeEnrollments.value.filter(ins =>
        !logs.value.some(l => l.estudiantes.id === ins.estudiantes.id && l.cursos.id === ins.cursos.id)
    ).length

    return { marcaciones, puntuales, retrasos, faltasHorario, inasistencias }
})

// Combinación de asistencias con estudiantes que no vinieron
const processedLogs = computed(() => {
    if (viewMode.value === 'historial') return logs.value

    // Si es Reporte Diario, cruzamos datos
    const reportData = [...logs.value]

    activeEnrollments.value.forEach(ins => {
        const yaMarco = logs.value.some(l =>
            l.estudiantes.id === ins.estudiantes.id && l.cursos.id === ins.cursos.id
        )
        if (!yaMarco) {
            reportData.push({
                isVirtual: true,
                id: `v-${ins.id}`,
                hora_entrada: null,
                estado: 'Inasistencia',
                pago_al_dia: true, // No relevante para inasistencia
                estudiantes: ins.estudiantes,
                cursos: ins.cursos
            })
        }
    })

    return reportData.sort((a, b) => {
        if (!a.hora_entrada) return 1
        if (!b.hora_entrada) return -1
        return new Date(b.hora_entrada) - new Date(a.hora_entrada)
    })
})

// 1. CARGAR DATOS (ASISTENCIAS E INSCRIPCIONES)
const fetchLogs = async () => {
    loading.value = true

    const start = `${fechaFiltro.value} 00:00:00`
    const end = `${fechaFiltro.value} 23:59:59`

    // A. Marcaciones reales
    const { data: dataLogs, error: errorLogs } = await supabase
        .from('registros_asistencia')
        .select(`
            id, hora_entrada, estado, pago_al_dia,
            estudiantes ( id, nombre, apellido_paterno ),
            cursos ( id, nombre )
        `)
        .gte('hora_entrada', start)
        .lte('hora_entrada', end)
        .order('hora_entrada', { ascending: false })

    // B. Inscripciones activas (para saber quiénes DEBERÍAN venir)
    const { data: dataIns, error: errorIns } = await supabase
        .from('inscripciones')
        .select(`
            id,
            estudiantes ( id, nombre, apellido_paterno ),
            cursos ( id, nombre )
        `)
        .eq('estado', 'activo')

    if (!errorLogs) logs.value = dataLogs || []
    if (!errorIns) activeEnrollments.value = dataIns || []

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

            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div class="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100">
                            <i class="pi pi-clock"></i>
                        </div>
                        Control de Asistencia
                    </h1>
                    <p class="text-slate-500 font-medium">Horario General: 09:00 AM - 01:00 PM</p>
                </div>

                <div
                    class="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
                    <div class="flex bg-slate-100 p-1 rounded-xl">
                        <Button :variant="viewMode === 'reporte' ? 'primary' : 'text'"
                            :class="['py-1.5! px-4! text-xs! font-bold! rounded-lg! transition-all', viewMode === 'reporte' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500']"
                            label="REPORTE HOY" icon="pi pi-calendar" @click="viewMode = 'reporte'" />
                        <Button :variant="viewMode === 'historial' ? 'primary' : 'text'"
                            :class="['py-1.5! px-4! text-xs! font-bold! rounded-lg! transition-all', viewMode === 'historial' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500']"
                            label="HISTORIAL" icon="pi pi-list" @click="viewMode = 'historial'" />
                    </div>
                    <div class="h-6 w-px bg-slate-200 mx-1"></div>
                    <input type="date" v-model="fechaFiltro"
                        class="border-none focus:ring-0 text-slate-700 font-black bg-transparent text-sm" />
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Marcaciones</p>
                    <div class="flex items-end justify-between">
                        <p class="text-2xl font-black text-slate-800">{{ stats.marcaciones }}</p>
                        <i class="pi pi-id-card text-slate-200 text-xl"></i>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p class="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-1">Puntuales</p>
                    <div class="flex items-end justify-between">
                        <p class="text-2xl font-black text-emerald-600">{{ stats.puntuales }}</p>
                        <i class="pi pi-check-circle text-emerald-100 text-xl"></i>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p class="text-[10px] text-orange-400 uppercase font-black tracking-widest mb-1">Retrasos</p>
                    <div class="flex items-end justify-between">
                        <p class="text-2xl font-black text-orange-500">{{ stats.retrasos }}</p>
                        <i class="pi pi-clock text-orange-100 text-xl"></i>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <p class="text-[10px] text-rose-500 uppercase font-black tracking-widest mb-1">Faltas Hoy</p>
                    <div class="flex items-end justify-between">
                        <p class="text-2xl font-black text-rose-600">{{ stats.faltasHorario }}</p>
                        <i class="pi pi-calendar-times text-rose-100 text-xl"></i>
                    </div>
                </div>

                <div class="p-4 rounded-2xl shadow-sm border border-slate-100 bg-slate-50/50">
                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Ausentes</p>
                    <div class="flex items-end justify-between">
                        <p class="text-2xl font-black text-slate-400">{{ stats.inasistencias }}</p>
                        <i class="pi pi-user-minus text-slate-200 text-xl"></i>
                    </div>
                </div>
            </div>

            <div class="card bg-white p-0 rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                <DataTable :value="processedLogs" :loading="loading" paginator :rows="15" class="p-datatable-sm"
                    tableStyle="min-width: 50rem">

                    <template #empty> No hay registros para esta fecha. </template>

                    <Column header="H. Entrada" style="width: 12%">
                        <template #body="slotProps">
                            <span v-if="slotProps.data.hora_entrada" class="font-mono font-bold text-slate-700 text-lg">
                                {{ formatTime(slotProps.data.hora_entrada) }}
                            </span>
                            <span v-else class="text-slate-300 font-bold italic text-sm">--:--</span>
                        </template>
                    </Column>

                    <Column header="Estudiante / Curso">
                        <template #body="slotProps">
                            <div class="flex flex-col">
                                <span
                                    :class="['font-bold', slotProps.data.isVirtual ? 'text-slate-400' : 'text-slate-800']">
                                    {{ slotProps.data.estudiantes?.nombre }} {{
                                        slotProps.data.estudiantes?.apellido_paterno }}
                                </span>
                                <div class="flex items-center gap-2 mt-1">
                                    <span
                                        :class="['text-[10px] font-bold px-2 py-0.5 rounded-full', slotProps.data.isVirtual ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600']">
                                        {{ slotProps.data.cursos?.nombre || 'Curso no especificado' }}
                                    </span>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column header="Estado Asistencia" style="width: 15%">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.estado" :severity="slotProps.data.estado === 'Asistencia' ? 'success' :
                                slotProps.data.estado === 'Retraso' ? 'warning' :
                                    slotProps.data.estado === 'Falta' ? 'danger' : 'secondary'"
                                :class="['uppercase text-[10px] font-black', slotProps.data.estado === 'Inasistencia' ? 'bg-slate-200! text-slate-500!' : '']" />
                        </template>
                    </Column>

                    <Column header="Situación Pago" style="width: 15%">
                        <template #body="{ data }">
                            <div v-if="data.isVirtual" class="text-slate-200 text-xs italic">No aplica</div>
                            <div v-else-if="data.pago_al_dia"
                                class="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase">
                                <i class="pi pi-check-circle"></i>
                                <span>AL DÍA</span>
                            </div>
                            <div v-else
                                class="flex items-center gap-2 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100 animate-pulse">
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