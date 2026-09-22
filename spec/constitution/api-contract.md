# Contrato de respuestas HTTP — Entreno 2.0 Backend

> Todo endpoint debe cumplir este contrato.
> El agente que implemente una feature debe verificar que sus responses coincidan con estos ejemplos antes de marcar la feature como hecha.

---

## Respuestas exitosas (2xx)

### GET — Item único (200)

Devuelve el objeto **directamente**, sin wrapper.

```json
GET /api/marcas/1 → 200 OK

{
  "id": 1,
  "nombre": "Nike",
  "activo": true,
  "createdAt": "2026-09-21T21:00:00.000Z",
  "updatedAt": "2026-09-21T21:00:00.000Z"
}
```

### GET — Listado con filtros (200)

Siempre con el wrapper `{ data, total }`. Paginación incluida cuando aplica.

```json
GET /api/marcas → 200 OK

{
  "data": [
    { "id": 1, "nombre": "Nike", "activo": true, "createdAt": "...", "updatedAt": "..." },
    { "id": 2, "nombre": "Adidas", "activo": true, "createdAt": "...", "updatedAt": "..." }
  ],
  "total": 2
}
```

#### Listado con paginación (cuando aplica: features 010, 013)

```json
GET /api/pedidos?page=1&size=10 → 200 OK

{
  "data": [ ... ],
  "total": 47,
  "page": 1,
  "size": 10
}
```

Valores por defecto: `page=1`, `size=20`. Máximo permitido: `size=100`.

### POST — Recurso creado (201)

Devuelve el recurso creado **directamente**, sin wrapper. Status `201`.

```json
POST /api/marcas → 201 Created

{
  "id": 3,
  "nombre": "Puma",
  "activo": true,
  "createdAt": "2026-09-21T22:00:00.000Z",
  "updatedAt": "2026-09-21T22:00:00.000Z"
}
```

### PUT — Recurso actualizado (200)

Devuelve el recurso actualizado **directamente**. Status `200`.

```json
PUT /api/marcas/3 → 200 OK

{
  "id": 3,
  "nombre": "Puma Pro",
  "activo": true,
  "createdAt": "2026-09-21T22:00:00.000Z",
  "updatedAt": "2026-09-21T22:05:00.000Z"
}
```

### DELETE — Baja lógica (204)

Sin body. Status `204 No Content`.

```
DELETE /api/marcas/3 → 204 No Content
(body vacío)
```

### POST de acción de negocio (200)

Para acciones como `/confirmar`, `/anular`, `/entregar`, `/cancelar` — devuelve el recurso con su nuevo estado.

```json
POST /api/carrito/confirmar → 200 OK

{
  "id": 42,
  "fecha": "2026-09-21T22:10:00.000Z",
  "estado": "REALIZADO",
  "importeTotal": "3450.00",
  "usuario": { "id": 5, "nombre": "Juan Croci", "email": "juan@example.com" },
  "items": [
    {
      "id": 1,
      "producto": { "id": 7, "nombre": "Proteína Whey 1kg" },
      "cantidad": 2,
      "precioUnitario": "1500.00",
      "subtotal": "2700.00",
      "descuentoAplicado": "10.00"
    }
  ]
}
```

---

## Respuestas de error (4xx / 5xx)

Todos los errores usan el mismo envelope. El `errorHandler` centralizado los emite.

### Formato base

```json
{
  "statusCode": 404,
  "message": "Marca no encontrada"
}
```

### Error de validación (400) — con detalle de campos

```json
POST /api/marcas con body inválido → 400 Bad Request

{
  "statusCode": 400,
  "message": "Error de validación",
  "details": [
    { "field": "nombre", "message": "nombre no debe estar vacío" },
    { "field": "nombre", "message": "nombre debe ser una cadena de texto" }
  ]
}
```

### Tabla de códigos de estado usados

| Código | Cuándo usarlo                                                                 |
| ------ | ----------------------------------------------------------------------------- |
| `200`  | GET exitoso, PUT exitoso, acción de negocio exitosa                           |
| `201`  | POST que crea un nuevo recurso                                                |
| `204`  | DELETE exitoso (baja lógica o eliminación)                                    |
| `400`  | Validación de DTO fallida, ID inválido, regla de negocio de entrada           |
| `401`  | Sin token o token inválido/expirado                                           |
| `403`  | Token válido pero rol insuficiente                                            |
| `404`  | Recurso no encontrado (activo)                                                |
| `409`  | Conflicto: duplicado único, transición de estado inválida, stock insuficiente |
| `500`  | Error interno no manejado (solo en desarrollo; producción no expone detalles) |

---

## Campos de respuesta a excluir siempre

Los siguientes campos **nunca** deben aparecer en ninguna respuesta:

- `passwordHash` (Usuario)
- Campos internos de MikroORM como `__helper`, `__initialized`

Usar serialización con MikroORM `wrap(entity).toObject()` si hay riesgo de filtración, o DTOs de respuesta explícitos cuando sea necesario.

---

## Convenciones de campos numéricos (dinero)

Los campos de dinero (`precioUnitario`, `importeTotal`, `subtotal`, etc.) se serializan como **string** en el JSON para evitar pérdida de precisión flotante:

```json
{
  "precioUnitario": "1500.00",
  "subtotal": "2700.00",
  "descuentoAplicado": "10.00"
}
```

En la entidad MikroORM: `@Property({ columnType: 'decimal(10,2)' })`.
En el DTO de entrada: `@IsDecimal()` o `@IsNumberString()` (a decidir al implementar 007 y documentar en su plan.md).
