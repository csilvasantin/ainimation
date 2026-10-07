# Carta de quiosco (`menu.json`) · esquema genérico

Esquema: [`xperiencias/kiosko-pedido/menu.schema.json`](../xperiencias/kiosko-pedido/menu.schema.json) (JSON Schema 2020-12).
Ejemplo: [`menu.starbucks.json`](../xperiencias/kiosko-pedido/menu.starbucks.json) — **datos de ejemplo, precios ficticios**.

Una carta por establecimiento, válida para cafetería, fast food, panadería, farmacia o tienda:

- `establishment` — `id`, `name`, `type` (cafeteria · fast-food · panaderia · farmacia · tienda…), `brandId` (marca blanca), `currency` (ISO 4217), `locale`.
- `categories[]` — `id`, `name{es,en}`, `image`.
- `items[]` — `id`, `category`, `name`, `description`, `image`, `basePrice`, `allergens[]`, `tags[]`, `available`, `optionGroups[]`.
- `optionGroups[]` — `type: single|multi`, `required`, `default`, `max`, `choices[{id,label,priceDelta,allergens}]` (tamaño, leche, extras, temperatura…).
- `upsells[]` — ids sugeridos en el carrito.
- `orderFlow` — `mode: simulated|pos`, `prefix` del número, `payment{qr,counter,checkoutUrl,note}`. El quiosco **nunca** pide datos de tarjeta: solo enlaza a un checkout alojado.
- `idle` — `resetSeconds` (12 por defecto, la regla de calle) y `warnSeconds`.

Precio de línea = `basePrice + Σ priceDelta` de las opciones elegidas × cantidad.
