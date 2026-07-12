# Blanchir le fond (ECOS)

Action rapide Finder qui applique **uniquement le blanchiment de fond** de
[`tools/combine-uniform`](../combine-uniform/) à **chaque image sélectionnée**, **sans les combiner**.

C'est le même traitement que la ligne « point blanc » de `combine-uniform.jsx` : un ajustement
**Levels** avec point blanc d'entrée à `WHITE_BRIGHT = 205`. Tout pixel dont le niveau est
**≥ 205 est ramené à 255** (blanc pur), ce qui **uniformise les blancs papier** des captures de
diapo (blanc pur / crème / gris clair) **sans toucher à l'encre ni aux couleurs**.

En prime, un `flatten()` préalable aplatit toute **transparence PNG sur blanc opaque**
(convention « fond blanc opaque » des images détourées).

- **Une ou plusieurs images** peuvent être sélectionnées : chacune est traitée **indépendamment**.
- Traitement **en place** et **non destructif** : avant remplacement, l'original est copié dans un
  sous-dossier **`.backup_blanc/`** (jamais écrasé s'il existe déjà — la toute première version est
  toujours préservée).
- Le format d'origine est conservé (PNG, JPG/JPEG, TIFF). Un format non géré est **ignoré**
  (signalé dans le récapitulatif), jamais corrompu.

> Différent de `tools/combine-uniform` (qui **combine** ≥ 2 images en un seul PNG et applique ce
> blanchiment à la fin). Ici on ne combine rien : on ne fait **que** le blanchiment, image par image.

## Fichiers

| Fichier | Rôle |
|---|---|
| `blanchir-fond.jsx` | Moteur Photoshop : backup, `flatten()`, point blanc Levels, réenregistre en place. |
| `quick-action.applescript` | Corps de l'Action rapide : lit la sélection et appelle le `.jsx`. |
| `Blanchir-fond-ECOS.workflow` | Le bundle (installé). |
| `install-quick-action.sh` | Installe le bundle (aucune dépendance Python). |

## Installation
```bash
bash tools/blanchir-fond/install-quick-action.sh
```
Si l'action n'apparaît pas : **Réglages Système → Clavier → Raccourcis → Services**.

## Utilisation
1. Finder : sélectionner **une ou plusieurs** images, clic droit →
   **Actions rapides** → **Blanchir le fond (ECOS)**.
2. Un récapitulatif indique le nombre d'images blanchies (et les éventuelles ignorées).
3. Les originaux restent disponibles dans le sous-dossier `.backup_blanc/` de chaque image.

## Réglages (tête de `blanchir-fond.jsx`)
- **Seuil de blanc** : `WHITE_BRIGHT = 205` (identique à `combine-uniform.jsx`). Baisser la valeur
  blanchit plus agressivement (mange les gris clairs) ; l'augmenter est plus prudent.
- **Qualité JPEG** : `12` (maximale) lors du réenregistrement des `.jpg/.jpeg`.

> Notes techniques : `app.displayDialogs = DialogModes.NO` (évite le modal de profil couleur à
> l'ouverture) ; `app.activeDocument = doc` avant `adjustLevels` ; `adjustLevels(0, 205, 1.0, 0, 255)`
> = point blanc à 205. Backup best-effort : un échec de copie ne bloque pas le blanchiment.
