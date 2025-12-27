<script setup>
import { reactive, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

const emit = defineEmits(['curso-creado'])
const loading = ref(false)
const mensaje = ref({ texto: '', severity: '' })

const form = reactive({
  nombre: '',
  costo_mensual: null,
  duracion_semanas: 4,
  cantidad_modulos: 1
})

const guardarCurso = async () => {
  if (!form.nombre || !form.costo_mensual) {
    mensaje.value = { texto: 'Completa los datos.', severity: 'error' }; return
  }
  loading.value = true

  const { error } = await supabase.from('cursos').insert([{
    nombre: form.nombre,
    costo_mensual: form.costo_mensual,
    duracion_semanas: form.duracion_semanas,
    cantidad_modulos: form.cantidad_modulos
  }])

  if (!error) {
    mensaje.value = { texto: 'Curso Creado con éxito', severity: 'success' }
    form.nombre = ''; form.costo_mensual = null; form.cantidad_modulos = 1;
    emit('curso-creado')
    setTimeout(() => mensaje.value = { texto: '', severity: '' }, 3000)
  } else {
    mensaje.value = { texto: error.message, severity: 'error' }
  }
  loading.value = false
}
</script>

<template>
  <div class="max-w-xl mx-auto">
    <div
      class="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-slate-200/60 overflow-hidden relative">
      <!-- Decoración -->
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
      <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-violet-50 rounded-full blur-3xl opacity-50"></div>

      <div class="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6 relative z-10">
        <div
          class="bg-linear-to-br from-indigo-500 to-indigo-700 p-3 rounded-2xl shadow-lg shadow-indigo-100 text-white">
          <i class="pi pi-book text-2xl"></i>
        </div>
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">Configurar Curso</h2>
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Parámetros Académicos</p>
        </div>
      </div>

      <form @submit.prevent="guardarCurso" class="space-y-8 relative z-10">

        <div class="pt-2">
          <FloatLabel variant="on">
            <InputText id="nombre" v-model="form.nombre"
              class="w-full rounded-2xl! border-slate-200! focus:border-indigo-500! bg-slate-50/30! py-3 px-4" />
            <label for="nombre" class="ml-2 text-slate-500">Nombre del Curso *</label>
          </FloatLabel>
        </div>

        <div class="pt-2">
          <FloatLabel variant="on">
            <InputNumber id="costo" v-model="form.costo_mensual" mode="currency" currency="USD" locale="en-US"
              class="w-full"
              inputClass="rounded-2xl! border-slate-200! focus:border-indigo-500! bg-slate-50/30! py-3 px-4" />
            <label for="costo" class="ml-2 text-slate-500">Costo Mensual *</label>
          </FloatLabel>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Cantidad Módulos</label>
            <InputNumber v-model="form.cantidad_modulos" showButtons buttonLayout="horizontal" :min="1" :max="48"
              class="w-full group" inputClass="w-full text-center font-bold! border-slate-200! bg-white!"
              incrementButtonClass="bg-slate-50! text-slate-600! border-slate-200! hover:bg-slate-100!"
              decrementButtonClass="bg-slate-50! text-slate-600! border-slate-200! hover:bg-slate-100!"
              incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold tracking-widest text-slate-400 ml-1">Duración del Curso (en Semanas)</label>
            <InputNumber v-model="form.duracion_semanas" showButtons buttonLayout="horizontal" :min="1" class="w-full"
              inputClass="w-full text-center font-bold! border-slate-200! bg-white!"
              incrementButtonClass="bg-slate-50! text-slate-600! border-slate-200! hover:bg-slate-100!"
              decrementButtonClass="bg-slate-50! text-slate-600! border-slate-200! hover:bg-slate-100!"
              incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
          </div>
        </div>

        <transition name="fade">
          <Message v-if="mensaje.texto" :severity="mensaje.severity" class="rounded-2xl! border-none shadow-sm">
            {{ mensaje.texto }}
          </Message>
        </transition>

        <Button type="submit" :loading="loading"
          class="w-full! py-4! rounded-2xl! border-none! text-lg! font-bold! bg-linear-to-r! from-indigo-600! to-indigo-800! text-white! shadow-xl hover:scale-[1.02]! active:scale-[0.98]! transition-all duration-300">
          <div class="flex items-center justify-center gap-3">
            <i class="pi pi-save"></i>
            <span>Guardar Nuevo Curso</span>
          </div>
        </Button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>