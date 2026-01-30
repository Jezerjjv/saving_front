# Saving Front - Gestión financiera personal

Interfaz web React (Vite) para la app de finanzas personales.

## Inicio

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Asegúrate de tener el backend en `http://localhost:3001` (el proxy de Vite redirige `/api` al backend).

## Funcionalidades

- **Cuentas**: Alta, edición y eliminación de cuentas; saldo por cuenta.
- **Movimientos**: Gastos e ingresos agrupados por día y categoría en acordeones. Añadir gasto, ingreso rápido y editar/eliminar.
- **Transferencias**: Realizar transferencias entre cuentas y ver historial.
- **Configuración**: Categorías (nombre e icono) e ingresos fijos; botón para aplicar ingresos fijos al mes actual.
