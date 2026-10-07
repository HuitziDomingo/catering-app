# Imágenes de la landing (temporales)

> **Todas las fotos son temporales.** Vienen de [Unsplash](https://unsplash.com) y se
> reemplazarán por fotos reales de Santo Sazón (platillos, montajes y eventos propios)
> antes de publicar la landing.

- Licencia: [Unsplash License](https://unsplash.com/license) (uso comercial gratuito,
  sin atribución obligatoria). Aun así damos crédito en el footer y aquí.
- Se cargan por URL directa desde `images.unsplash.com`, recortadas con `fit=crop`;
  no se guardan en el repo.
- Todas se verificaron con HTTP 200 al armar el mockup (2026-10-07). El autor de cada
  una se tomó de los resultados de búsqueda de Unsplash y se comprobó dos veces; antes
  de publicar, revisa el crédito en la página de cada foto.
- Los datos (id, alt, autor) viven en `src/data/site.ts` (`photos`). Para cambiar una
  foto, cambia ahí su `id` y su crédito; este archivo y el footer se mantienen a mano.

## Créditos

| Dónde se usa | Foto | Autor |
|---|---|---|
| Hero | [Mesa vista desde arriba con cazuelas de barro, enchiladas, arroz y salsas](https://images.unsplash.com/photo-1676081986290-ac79c2968c3f) | [Israel Caballero](https://unsplash.com/@isracab) |
| Servicios: eventos sociales | [Invitados brindando con copas en una celebración iluminada](https://images.unsplash.com/photo-1527529482837-4698179dc6ce) | [Al Elmes](https://unsplash.com/@alelmes) |
| Servicios: corporativos | [Buffet con charolas de acero llenas de comida para un evento](https://images.unsplash.com/photo-1555244162-803834f70033) | [Saile Ilyas](https://unsplash.com/@saile_ilyas) |
| Servicios: bodas | [Salón de boda con mesas largas, sillas doradas y luces colgantes](https://images.unsplash.com/photo-1723832348105-2e69f948135a) | [Jennifer Kalenberg](https://unsplash.com/@jkalen71) |
| Servicios: para llevar | [Cajas de cartón con bocadillos listas para llevar](https://images.unsplash.com/photo-1672826979217-7156a305acf5) | [Thriday](https://unsplash.com/@thriday) |
| Menú: tacos al pastor | [Tres tacos con carne y limón sobre una tabla de madera](https://images.unsplash.com/photo-1648437595587-e6a8b0cdf1f9) | [Frankie Lopez](https://unsplash.com/@frankielopez) |
| Menú: tacos de suadero | [Tacos de res en tortilla de maíz con cebolla y cilantro](https://images.unsplash.com/photo-1599974579688-8dbdd335c77f) | [Jeswin Thomas](https://unsplash.com/@jeswinthomas) |
| Menú: tacos de la huerta | [Tacos de verduras asadas con limón exprimido encima](https://images.unsplash.com/photo-1565299585323-38d6b0865b47) | [Chad Montano](https://unsplash.com/@briewilly) |
| Menú: guacamole | [Guacamole, totopos y un plato hondo sobre un mantel bordado](https://images.unsplash.com/photo-1628394029816-1dc524670f60) | [Jed Owen](https://unsplash.com/@jediahowen) |
| Menú: totopos preparados | [Totopos con frijoles, queso y pico de gallo en un tazón negro](https://images.unsplash.com/photo-1582169296194-e4d644c48063) | [Coffeefy Workafe](https://unsplash.com/@coffeefyworkafe) |
| Menú: guisados en cazuela | [Guisados servidos en cazuelas de barro sobre azulejo de talavera](https://images.unsplash.com/photo-1584208632869-05fa2b2a5934) | [Roberto Carlos Román Don](https://unsplash.com/@srcharls) |
| Galería | [Tacos, guacamole y salsas sobre una mesa de azulejos de colores](https://images.unsplash.com/photo-1700625916627-16ad4fb0553c) | [Hybrid Storytellers](https://unsplash.com/@hybridstorytellers) |
| Galería | [Mesa de bocadillos con pan, quesos y fruta en un evento al aire libre](https://images.unsplash.com/photo-1576842546422-60562b9242ae) | [Yukiko Kanada](https://unsplash.com/@okikuy0930) |
| Galería | [Cocinera con guantes emplatando platillos en una cocina profesional](https://images.unsplash.com/photo-1687369595840-e96a912586f1) | [Gastro Editorial](https://unsplash.com/@gastroeditorial) |
| Galería | [Charolas con panes rellenos y tartaletas para un evento](https://images.unsplash.com/photo-1637059395523-d5a35541d544) | [Adele De Bruyn](https://unsplash.com/@adele27) |
| Galería | [Salón con mesas redondas vestidas y centros de flores](https://images.unsplash.com/photo-1524824267900-2fa9cbf7a506) | [Thomas William](https://unsplash.com/@thomasw) |
| Galería | [Mesa de madera con platos, copas y hojas verdes para una cena](https://images.unsplash.com/photo-1647296020388-787fdae78e3c) | [Taylor Gray](https://unsplash.com/@captured_photography) |

## Cómo reemplazarlas por fotos reales

1. Pon las fotos del negocio en `public/fotos/` (o en el bucket de imágenes, ADR-028).
2. Cambia `photoUrl`/`photoSrcset` en `src/data/site.ts` para que apunten a esas rutas.
3. Quita los créditos de Unsplash del footer y de este archivo.
