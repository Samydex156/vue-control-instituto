<script setup>
import { ref, onMounted } from 'vue';
import Chart from 'primevue/chart';
import Button from 'primevue/button';
import { supabase } from '../lib/supabaseClient'; // Asegúrate que la ruta sea correcta
import jsPDF from 'jspdf';

// 1. ESTADO DE SUPABASE
const supabaseStatus = ref('Verificando conexión...');
const checkSupabase = async () => {
    try {
        // Intenta una consulta simple (asegurate de tener alguna tabla o solo verifica el cliente)
        const { data, error } = await supabase.from('estudiantes').select('count', { count: 'exact', head: true });
        if (!error) supabaseStatus.value = 'Conectado ✅';
        else supabaseStatus.value = `Error: ${error.message}`;
    } catch (e) {
        supabaseStatus.value = 'Desconectado ❌ (Revisa .env)';
    }
};

// 2. CONFIGURACIÓN DE GRÁFICA (Chart.js)
const chartData = ref({
    labels: ['Vue', 'React', 'Angular', 'Svelte'],
    datasets: [{
        label: 'Popularidad (Demo)',
        data: [540, 325, 102, 220],
        backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#f97316']
    }]
});
const chartOptions = ref({ responsive: true });

// 3. GENERACIÓN DE PDF (jsPDF)
const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Hola Mundo desde Vue Base Template!", 10, 10);
    doc.text(`Estado de Base de Datos: ${supabaseStatus.value}`, 10, 20);
    doc.save("demo-reporte.pdf");
};

onMounted(() => {
    checkSupabase();
});
</script>

<template>
    <div class="space-y-6">
        <h2 class="text-2xl font-bold text-slate-800">Zona de Pruebas</h2>
        <p class="text-slate-500">Verifica que todas las dependencias funcionan correctamente.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 class="font-bold mb-4 flex items-center gap-2">
                    <i class="pi pi-database text-indigo-500"></i> Supabase
                </h3>
                <div class="p-3 bg-slate-50 rounded text-sm font-mono">
                    {{ supabaseStatus }}
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 class="font-bold mb-4 flex items-center gap-2">
                    <i class="pi pi-file-pdf text-red-500"></i> Reportes
                </h3>
                <Button label="Probar Descarga PDF" icon="pi pi-download" severity="danger" outlined @click="downloadPDF" />
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 md:col-span-2">
                <h3 class="font-bold mb-4 flex items-center gap-2">
                    <i class="pi pi-chart-bar text-emerald-500"></i> Gráficas (PrimeVue + Chart.js)
                </h3>
                <div class="h-64 flex justify-center">
                    <Chart type="bar" :data="chartData" :options="chartOptions" class="h-full w-full" />
                </div>
            </div>
        </div>
    </div>
</template>