/**
 * Constantes para el onboarding
 * Categorías y actividades disponibles
 * 
 * 📝 PARA AGREGAR MÁS CATEGORÍAS O ACTIVIDADES:
 * Simplemente agrega nuevos objetos al array correspondiente.
 * El componente HoneycombGrid organizará automáticamente en patrón 4-5-4.
 */

// Categorías de interés (Top 8 recomendadas)
// ⬇️ AGREGAR MÁS CATEGORÍAS AQUÍ ⬇️
export const ONBOARDING_CATEGORIES = [
  { slug: 'tecnologia', label: 'Tecnología' },
  { slug: 'moda', label: 'Moda' },
  { slug: 'hogar', label: 'Hogar' },
  { slug: 'salud-bienestar', label: 'Salud & Bienestar' },

  { slug: 'deportes', label: 'Deportes' },
  { slug: 'cocina', label: 'Cocina' },
  { slug: 'mascotas', label: 'Mascotas' },
  { slug: 'jugueteria', label: 'Juguetería' },
  { slug: 'libros', label: 'Libros' },

  { slug: 'cine-series', label: 'Cine y Series' },
  { slug: 'musica', label: 'Música' },
  { slug: 'viajes', label: 'Viajes' },
  { slug: 'videojuegos', label: 'Videojuegos' },
] as const

// Actividades/Hobbies (12 oficiales)
// ⬇️ AGREGAR MÁS ACTIVIDADES AQUÍ ⬇️
export const ONBOARDING_ACTIVITIES = [
  { slug: 'lectura', label: 'Lectura', emoji: '📚' },
  { slug: 'running', label: 'Running', emoji: '🏃' },
  { slug: 'arte-dibujo', label: 'Arte & Dibujo', emoji: '🎨' },
  { slug: 'musica', label: 'Música', emoji: '🎵' },

  { slug: 'cine-series', label: 'Cine y series', emoji: '🎬' },
  { slug: 'entrenamiento-fisico', label: 'Entrenamiento físico', emoji: '💪' },
  { slug: 'cocina', label: 'Cocina', emoji: '🍳' },
  { slug: 'videojuegos', label: 'Videojuegos', emoji: '🎮' },
  { slug: 'fotografia', label: 'Fotografía', emoji: '📸' },

  { slug: 'bienestar-meditacion', label: 'Bienestar & Meditación', emoji: '🧘' },
  { slug: 'moda-estilo', label: 'Moda & Estilo', emoji: '👗' },
  { slug: 'viajes', label: 'Viajes', emoji: '✈️' },
  { slug: 'escritura', label: 'Escritura', emoji: '✍️' },
] as const

// Meses del año
export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
] as const

// Días del mes (1-31)
export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// Textos de los pasos
export const ONBOARDING_STEPS = [
  {
    title: '🎉 ¿Cuándo celebramos contigo?',
    subtitle: 'Queremos sorprenderte en tu día especial.',
    helper: 'Nada de spam, lo prometemos 😉',
  },
  {
    title: '🛍️ ¿Qué te gustaría ver primero?',
    subtitle: 'Elige las categorías que más te llaman la atención.',
    helper: 'Así personalizamos tu feed desde el primer momento.',
    secondaryLabel: 'Top recomendadas',
  },
  {
    title: '💡 ¿Qué disfrutas hacer en tu tiempo libre?',
    subtitle: 'Queremos mostrarte contenido que vaya contigo.',
  },
] as const
