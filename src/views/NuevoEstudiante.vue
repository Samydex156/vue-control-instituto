<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../lib/supabaseClient'

const emit = defineEmits(['estudiante-creado'])

const loading = ref(false)
const mensaje = ref({ texto: '', tipo: '' })
const listaCursos = ref([]) // Para llenar el campo 'clase'

// Formulario con los nuevos campos
const form = reactive({
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  ci: '',
  telefono: '',
  clase: '', // Esto equivale al 'Curso'
  notas_adicionales: ''
})

// 1. Cargar cursos para mostrarlos en el select
const cargarCursos = async () => {
  const { data } = await supabase.from('cursos').select('nombre').order('nombre')
  listaCursos.value = data || []
}

// 2. Lógica para Generar el QR (Réplica de tu Dart)
const generarCodigoQR = (id, nombre, paterno, materno, clase) => {
  // Obtener iniciales: Juan Perez Ramos -> JPR
  const inicialNombre = nombre ? nombre.trim().charAt(0).toUpperCase() : ''
  const inicialPaterno = paterno ? paterno.trim().charAt(0).toUpperCase() : ''
  const inicialMaterno = materno ? materno.trim().charAt(0).toUpperCase() : ''
  
  const inicialesPersona = `${inicialNombre}${inicialPaterno}${inicialMaterno}`

  // Obtener código de clase: Ofimática -> Ofi
  let codigoClase = ''
  if (clase) {
    const palabras = clase.trim().split(' ')
    if (palabras.length === 1 && palabras[0].length >= 3) {
      // Si es una palabra larga (Ofimatica), toma las 3 primeras (Ofi)
      codigoClase = palabras[0].substring(0, 3)
      codigoClase = codigoClase.charAt(0).toUpperCase() + codigoClase.slice(1).toLowerCase()
    } else {
      // Si son varias (Base de Datos), toma iniciales (BD)
      codigoClase = palabras.map(p => p.charAt(0).toUpperCase()).join('')
    }
  }

  // Formato Final: JPR-Ofi-1
  return `${inicialesPersona}-${codigoClase}-${id}`
}

// 3. Guardar Estudiante
const guardarEstudiante = async () => {
  if (!form.nombre || !form.apellido_paterno || !form.clase) {
    mensaje.value = { texto: 'Nombre, Apellido Paterno y Clase son obligatorios', tipo: 'error' }
    return
  }

  loading.value = true
  mensaje.value = { texto: '', tipo: '' }

  try {
    // PASO A: Insertar datos básicos (sin el QR aun)
    // Nota: Guardamos "nombre" solo como el nombre de pila.
    const { data: estudianteInsertado, error: errorInsert } = await supabase
      .from('estudiantes')
      .insert([
        {
          nombre: form.nombre,
          apellido_paterno: form.apellido_paterno,
          apellido_materno: form.apellido_materno,
          ci: form.ci,
          telefono: form.telefono,
          clase: form.clase, // Guardamos el nombre del curso como texto para compatibilidad
          notas_adicionales: form.notas_adicionales
        }
      ])
      .select()
      .single()

    if (errorInsert) throw errorInsert

    // PASO B: Generar el string del QR usando el ID recién creado
    const nuevoId = estudianteInsertado.id
    const qrString = generarCodigoQR(
      nuevoId, 
      form.nombre, 
      form.apellido_paterno, 
      form.apellido_materno, 
      form.clase
    )

    // PASO C: Actualizar el estudiante con su QR
    const { error: errorUpdate } = await supabase
      .from('estudiantes')
      .update({ codigo_qr_data: qrString })
      .eq('id', nuevoId)

    if (errorUpdate) throw errorUpdate

    // Éxito
    mensaje.value = { texto: `¡Estudiante creado! QR: ${qrString}`, tipo: 'exito' }
    
    // Limpiar formulario
    Object.keys(form).forEach(key => form[key] = '')
    
    emit('estudiante-creado')

  } catch (error) {
    console.error(error)
    mensaje.value = { texto: 'Error: ' + error.message, tipo: 'error' }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargarCursos()
})
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
      <span class="bg-indigo-600 text-white rounded-full p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
           <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </span>
      Registrar Nuevo Estudiante
    </h2>

    <form @submit.prevent="guardarEstudiante" class="space-y-6">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre(s) *</label>
          <input v-model="form.nombre" type="text" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Juan" required />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Apellido Paterno *</label>
          <input v-model="form.apellido_paterno" type="text" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Pérez" required />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Apellido Materno</label>
          <input v-model="form.apellido_materno" type="text" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Ramos" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Cédula (CI)</label>
          <input v-model="form.ci" type="text" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: 8432123 LP" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
          <input v-model="form.telefono" type="tel" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: 77712345" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Curso Inicial (Clase) *</label>
          <select v-model="form.clase" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" required>
            <option value="" disabled>-- Selecciona --</option>
            <option v-for="c in listaCursos" :key="c.nombre" :value="c.nombre">
              {{ c.nombre }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Notas Adicionales</label>
        <textarea v-model="form.notas_adicionales" rows="2" class="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Estudiante becado, horario especial, etc."></textarea>
      </div>

      <div v-if="mensaje.texto" :class="`p-3 rounded text-sm text-center font-bold ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`">
        {{ mensaje.texto }}
      </div>

      <button 
        type="submit" 
        :disabled="loading"
        class="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-semibold transition shadow-md flex justify-center items-center"
      >
        <span v-if="loading">Guardando...</span>
        <span v-else>Guardar Estudiante</span>
      </button>

    </form>
  </div>
</template>