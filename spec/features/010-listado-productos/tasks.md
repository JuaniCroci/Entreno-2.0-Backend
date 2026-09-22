# 010 · Listado de productos — Tareas

- [ ] `FilterProductoPublicDto` con validaciones numéricas y enums de orden
- [ ] `ProductoService.listPublic` con where combinado, orden y paginación
- [ ] Ajustar `getByIdPublic` (solo activos, respuesta con `disponible` y relaciones)
- [ ] Revisar/ajustar `routes` (`GET /api/productos` público vs admin)
- [ ] Incluir descuentos vigentes en el detalle (si 008 está listo)
- [ ] Test unit: cada filtro, combinaciones AND, precioMin > precioMax, orden inválido
- [ ] Test integración: listado filtra por tipo, marca, precio y combinados
- [ ] Test integración: paginación y `total`
- [ ] Test integración: detalle 404 (inexistente e inactivo)
- [ ] Regresión: tests de 007 siguen pasando (rutas no rotas)
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
