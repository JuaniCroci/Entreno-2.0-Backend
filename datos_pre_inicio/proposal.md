# Propuesta TP DSW

## Grupo

### Integrantes

- 50738 - Bruno, Carlos Uriel
- 51136 - Cano, Julián
- 48077 - Croci, Juan Ignacio
- 48231 - Molina, Stella Maris

### Repositorios

- [frontend app](https://github.com/JuaniCroci/Frontend-TP-DSW)
- [backend app](https://github.com/JuaniCroci/Backend-TP-DSW)
  _Nota_: si utiliza un monorepo indicar un solo link con fullstack app.

## Tema

**_Nombre:_** Entreno2.0

### Descripción

_Entreno2.0 es una plataforma de venta de artículos de gimnasio y entrenamiento: Suplementos, accesorios y mucho más! Registrate, armá tu pedido y disfrutá el ejercicio con todo!_

### Modelo

[Imagen del modelo](https://drive.google.com/file/d/1IFZUrqD7l6zfVw1cLKX7Z9dRzmr3qOQk/view?usp=sharing)

## Alcance Funcional

### Alcance Mínimo

Regularidad:
|Req|Detalle|
|:-|:-|
|CRUD simple|1. CRUD Cliente<br>2. CRUD Proveedor<br>3. CRUD Tipo producto<br>4. CRUD Marca|
|CRUD dependiente|1. CRUD Producto {depende de} CRUD Tipo producto + CRUD Proveedor + CRUD Marca<br>2. CRUD Descuento {depende de} CRUD Producto|
|Listado<br>+<br>detalle| 1. Listado de productos filtrado por tipo de producto, marca y rango de precio. Muestra: nombre, marca, precio y disponibilidad (en stock / sin stock). ⇒ Detalle muestra: Datos completos del producto + CRUD Producto<br> 2. Listado de pedidos realizados filtrado por rango de fecha de realizado, estado (realizado, cancelado, abonado, entregado) y cliente. Muestra: Nro. de pedido, fecha de realizado, fecha de entrega, importe total y nombre de cliente. ⇒ Detalle muestra: datos completos de los productos (nombre, cantidad, precio unitario, subtotal) y del cliente (nombre, dirección, telefono, mail)|
|CUU/Epic|1. Hacer pedido (carrito)<br>2. Entregar/cancelar pedido|

Adicionales para Aprobación
|Req|Detalle|
|:-|:-|
|CRUD simple|5. CRUD Tag|
|CRUD dependiente| 3. CRUD Favorito {depende de} CRUD Producto + CRUD Cliente|
|CUU/Epic|3. Abonar pedido<br>4. Agregar reseña de producto|

### Alcance Adicional Voluntario

_Nota_: El Alcance Adicional Voluntario es opcional, pero ayuda a que la funcionalidad del sistema esté completa y será considerado en la nota en función de su complejidad y esfuerzo.

| Req      | Detalle                                                                                                                                                                                                                                                                                                                                                                            |
| :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listados | 1. Listado de productos filtrado por objetivo (volumen, definición, rendimiento), marca y rango de precio, muestra nombre, precio y disponibilidad ⇒ detalle muestra información completa del producto <br>2. Listado de pedidos filtrado por rango de fecha y estado, muestra número de pedido, cliente, total y estado ⇒ detalle muestra productos incluidos y datos del cliente |
| CUU/Epic | 1. Aplicar descuento/cupón a pedido <br>2. Seguimiento de pedido (cambio de estado: pendiente, enviado entregado)                                                                                                                                                                                                                                                                  |
| Otros    | 1.Notificación de producto sin stock / reposición (email o alerta en sistema) <br>2. Sistema de valoración y reseñas de productos                                                                                                                                                                                                                                                  |
