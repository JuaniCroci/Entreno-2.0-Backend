# 010 · Listado de productos — Tareas

- [x] `FilterProductoPublicDto` con validaciones numéricas y enums de orden
- [x] `ProductoService.findAll` con where combinado, orden y paginación
- [x] Ajustar `getByIdPublic` (solo activos, respuesta con `disponible` y relaciones)
- [x] Revisar/ajustar `routes` (`GET /api/productos` público vs admin)
- [x] Incluir descuentos vigentes en el detalle (si 008 está listo)
- [x] Test unit: cada filtro, combinaciones AND, precioMin > precioMax, orden inválido
- [x] Test integración: listado filtra por tipo, marca, precio y combinados
- [x] Test integración: paginación y `total`
- [x] Test integración: detalle 404 (inexistente e inactivo)
- [x] Regresión: tests de 007 siguen pasando (rutas no rotas)
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
