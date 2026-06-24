# 🍔 Zet Burgers

Website ultra-modern pentru restaurantul **Zet Burgers** — smash burgers artizanali din Cluj-Napoca.

Un site **single-page**, fără dependențe și fără build step, cu un design *liquid glass*
și un background animat care reacționează la evenimente.

## ✨ Funcționalități

- **Design liquid glass** — glassmorphism real (blur, sheen, reflexii interne) pe nav, carduri, formulare și modal.
- **Background animat pe bază de evenimente** — un canvas cu particule/scântei care reacționează la:
  - **poziția cursorului** (particulele se feresc de mouse + cursor glow),
  - **viteza de scroll** (particulele accelerează când derulezi),
  - **ora din zi** (paletă *daypart*: dimineață / zi / apus / noapte).
- **Growing cards** — cardurile din meniu cresc dintr-un punct de origine (cel apăsat) într-un modal, cu animație spring.
- **Tilt 3D** la carduri pe baza poziției pointerului, plus sheen radial.
- **Scroll reveal**, **nav care se micșorează**, **contoare animate** și un ticker de comenzi „live”.
- **Status Deschis/Închis** calculat din program, **comutator de ambianță** (🌗) și **formular de rezervare** funcțional (cu validare + persistență locală).
- **Accesibil & responsive** — suport `prefers-reduced-motion`, navigare la tastatură pentru carduri/modal, layout adaptiv.

## 🗂️ Structură

```
index.html        — marcajul paginii
css/styles.css    — sistemul de design liquid glass
js/menu-data.js   — catalogul de meniu (editabil separat)
js/main.js        — logica: background, daypart, modal, formular
```

## ▶️ Rulare

Nu necesită build. Deschide `index.html` direct, sau pornește un server static:

```bash
python3 -m http.server 8000
# apoi deschide http://localhost:8000
```

## 🎨 Personalizare

- **Meniul** se editează în `js/menu-data.js`.
- **Culorile / ambianțele** sunt token-uri CSS în `:root` și `body[data-daypart=...]` din `css/styles.css`.
- **Programul** (Deschis/Închis) se ajustează în funcția `refreshOpenStatus` din `js/main.js`.
