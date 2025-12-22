# StepSelectUser Component

Componente de selección de usuario para el flujo de Stalker Gift.

---

## 📍 Ubicación

`Tanku-storefront/src/modules/home/components/tabs/stalkergift/StepSelectUser.tsx`

---

## 🎯 Propósito

Permite al usuario seleccionar el destinatario de un regalo sorpresa (Stalker Gift). Ofrece dos opciones:
1. **Mis Amigos**: Lista de amigos del usuario actual
2. **Buscar Usuarios**: Búsqueda global de usuarios de Tanku

---

## 📦 Props

```typescript
interface StepSelectUserProps {
  onSelectUser: (user: TankuUser) => void  // Callback cuando se selecciona un usuario
  onBack: () => void                        // Callback para volver atrás
  selectedUserId?: string                   // ID del usuario ya seleccionado (opcional)
}
```

---

## 🔧 Tipos

```typescript
interface TankuUser {
  id: string              // ID único del usuario
  name: string            // Nombre completo
  username?: string       // @usuario (opcional)
  email?: string          // Email (opcional)
  avatar?: string         // URL del avatar (opcional)
  isFriend?: boolean      // Si es amigo del usuario actual
}
```

---

## 🎨 Características

### ✅ **Funcionalidades Principales**

1. **Tabs de Navegación**
   - Tab "Mis Amigos": Muestra amigos precargados
   - Tab "Buscar Usuarios": Búsqueda en tiempo real

2. **Búsqueda Inteligente**
   - Debounce de 300ms
   - Mínimo 3 caracteres
   - Loading spinner durante búsqueda
   - Mensaje cuando no hay resultados

3. **Tarjetas de Usuario**
   - Avatar circular
   - Nombre y username
   - Badge de "Amigo" si aplica
   - Indicador de selección
   - Hover effects

4. **Feedback Visual**
   - Checkmark animado en usuario seleccionado
   - Bordes con gradiente de color
   - Animaciones suaves
   - Estados de carga

---

## 📖 Uso Básico

```typescript
import StepSelectUser from "./stalkergift/StepSelectUser"

function ParentComponent() {
  const [selectedUser, setSelectedUser] = useState<TankuUser | null>(null)
  const [currentStep, setCurrentStep] = useState<string>("select-user")

  const handleSelectUser = (user: TankuUser) => {
    setSelectedUser(user)
    // Avanzar al siguiente paso
    setCurrentStep("next-step")
  }

  const handleBack = () => {
    setCurrentStep("intro")
  }

  return (
    <StepSelectUser
      onSelectUser={handleSelectUser}
      onBack={handleBack}
      selectedUserId={selectedUser?.id}
    />
  )
}
```

---

## 🎣 Hook Personalizado

El componente viene con un hook `useUserSelection` para gestionar la lógica:

```typescript
import { useUserSelection } from "./hooks/useUserSelection"

function MyComponent() {
  const {
    selectedUser,
    friends,
    searchResults,
    isLoadingFriends,
    isSearching,
    searchTerm,
    selectUser,
    clearSelection,
    setSearchTerm,
    searchUsers,
    loadFriends,
  } = useUserSelection()

  // Usar en tu componente
}
```

---

## 🎨 Personalización de Estilos

### Colores Principales

```css
--color-primary: #66DEDB      /* Turquesa */
--color-gradient-start: #3B9BC3
--color-gradient-end: #5FE085
--color-dark-bg: #262626
```

### Clases Principales

```tsx
// Tarjeta de usuario
bg-gradient-to-br from-[#262626] to-[#66DEDB]/10

// Borde seleccionado
border-[#66DEDB] shadow-lg shadow-[#66DEDB]/30

// Avatar con gradiente
bg-gradient-to-r from-[#3B9BC3] to-[#5FE085]
```

---

## 📊 Estados del Componente

### 1. **Cargando Amigos**
```tsx
{isLoadingFriends && (
  <Loader2 className="animate-spin" />
)}
```

### 2. **Sin Amigos**
```tsx
{friends.length === 0 && (
  <div>No tienes amigos aún</div>
)}
```

### 3. **Buscando**
```tsx
{isSearching && (
  <Loader2 className="animate-spin" />
)}
```

### 4. **Sin Resultados**
```tsx
{searchResults.length === 0 && (
  <div>No se encontraron usuarios</div>
)}
```

---

## 🔄 Integración con API

### Mock Data (Desarrollo)

Actualmente usa datos mock. Para integrar con el API real:

```typescript
// En useUserSelection.ts

const loadFriends = async () => {
  setIsLoadingFriends(true)
  try {
    const response = await fetch('/api/friends')
    if (!response.ok) throw new Error('Error loading friends')
    const data = await response.json()
    setFriends(data.friends)
  } catch (error) {
    console.error(error)
  } finally {
    setIsLoadingFriends(false)
  }
}

const searchUsers = async (query: string) => {
  setIsSearching(true)
  try {
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error('Error searching users')
    const data = await response.json()
    setSearchResults(data.users)
  } catch (error) {
    console.error(error)
  } finally {
    setIsSearching(false)
  }
}
```

---

## 🧩 Componentes Relacionados

1. **IntroView**: Vista inicial del flujo
2. **ForExternalUserView**: Formulario para usuarios externos
3. **ForTankuUserView**: Flujo para usuarios de Tanku (usa StepSelectUser)
4. **ProductSelectionView**: Siguiente paso después de seleccionar usuario

---

## 📱 Responsive Design

El componente es totalmente responsive:

```tsx
// Grid de 2 columnas en desktop
<div className="grid md:grid-cols-2 gap-4">
  {users.map(user => <UserCard key={user.id} user={user} />)}
</div>
```

---

## 🎭 Animaciones

### Checkmark en Selección
```tsx
<div className="animate-bounce">
  <span>✓</span>
</div>
```

### Slide In del Tab Indicator
```tsx
<div className="animate-slideIn h-0.5 bg-[#66DEDB]" />
```

### Hover Effects
```tsx
hover:border-[#66DEDB]/60 hover:shadow-md hover:shadow-[#66DEDB]/20
```

---

## 🔍 Búsqueda

### Características de Búsqueda

- **Debounce**: 300ms
- **Mínimo**: 3 caracteres
- **Búsqueda por**: Nombre y username
- **Case insensitive**

### Algoritmo de Búsqueda

```typescript
const results = users.filter(user =>
  user.name.toLowerCase().includes(query.toLowerCase()) ||
  user.username?.toLowerCase().includes(query.toLowerCase())
)
```

---

## 📋 Checklist de Integración

- [ ] Conectar `loadFriends()` con API de amigos
- [ ] Conectar `searchUsers()` con API de búsqueda
- [ ] Implementar paginación para listas largas
- [ ] Agregar caché de resultados de búsqueda
- [ ] Implementar infinite scroll (opcional)
- [ ] Agregar filtros avanzados (opcional)
- [ ] Implementar favoritos/recientes (opcional)

---

## 🎯 Próximos Pasos

1. **Integrar con API Backend**: Conectar con endpoints reales
2. **Agregar Paginación**: Para listas de amigos largas
3. **Caché de Búsquedas**: Guardar resultados recientes
4. **Filtros Avanzados**: Por ubicación, intereses, etc.
5. **Historial de Selecciones**: Mostrar usuarios a quienes ya se les envió regalos

---

## 🐛 Troubleshooting

### Problema: No se muestran amigos
**Solución**: Verificar que `loadFriends()` esté siendo llamado correctamente

### Problema: La búsqueda no funciona
**Solución**: Verificar que el término tenga >= 3 caracteres y el debounce esté configurado

### Problema: Los avatares no cargan
**Solución**: Verificar URLs de avatares o usar placeholder

---

## 📚 Recursos

- [Lucide Icons](https://lucide.dev/) - Iconos utilizados
- [Tailwind CSS](https://tailwindcss.com/) - Framework de estilos
- [React Hooks](https://react.dev/reference/react) - Documentación oficial

---

**Creado**: 2025-01-22
**Versión**: 1.0.0
**Autor**: Claude Code Assistant