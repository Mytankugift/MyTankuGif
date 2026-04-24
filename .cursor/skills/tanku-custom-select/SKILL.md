# Tanku custom select (menú desplegable)

## Cuándo usarlo

Sustituye al `<select>` nativo cuando necesites:

- Forma **píldora** (`rounded-full`) alineada con la UI Tanku
- Flecha **centrada** en una columna fija a la derecha
- Lista desplegable con **esquinas redondeadas** (`rounded-2xl`) — el `<select>` nativo no permite estilizar el popup del SO

## Implementación

Componente: `tanku-front/components/ui/tanku-custom-select.tsx` — export **`TankuCustomSelect`**.

```tsx
import { TankuCustomSelect } from '@/components/ui/tanku-custom-select'

<TankuCustomSelect
  label="Plataforma"
  labelId="platform-label"
  placeholder="Selecciona una plataforma"
  value={value}
  onChange={setValue}
  options={[
    { value: '', label: 'Selecciona una plataforma' },
    ...items.map((x) => ({ value: x.id, label: x.name })),
  ]}
  menuZIndex={260}
/>
```

## Detalles

- El menú se monta con **`createPortal`** en `document.body` y posición `fixed`, para no quedar recortado por `overflow` de modales.
- **`menuZIndex`**: por defecto `260`; si hay varias capas, súbelo por encima del modal activo.
- Opciones con `value: ''` sirven como placeholder discreto en la lista.
