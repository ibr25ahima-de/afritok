# Audit du système d’effets visage AfriTok

**Date :** 7 septembre 2026  
**Périmètre :** caméra, capture photo/vidéo, détection faciale, beauté, effets AR, aperçu et publication  
**Statut :** audit terminé, aucune modification fonctionnelle effectuée pendant cet audit

## 1. Conclusion générale

AfriTok possède déjà une chaîne technique fonctionnelle pour appliquer des effets visage en temps réel. Le parcours actuel est le suivant : la caméra fournit un flux vidéo, MediaPipe Face Landmarker détecte un visage, un canvas dessine l’image recadrée, le pipeline beauté applique des corrections, puis le renderer dessine l’effet sélectionné. Le canvas traité sert ensuite de source pour la photo capturée et pour la vidéo enregistrée.

Cette base est suffisante pour construire une expérience proche du parcours TikTok montré dans la capture. Elle n’est toutefois pas encore au même niveau de fidélité. Le système actuel affiche des miniatures génériques en SVG, et non un aperçu du visage réel de l’utilisateur avec l’effet appliqué. Les effets sont principalement dessinés avec des formes Canvas 2D. Ils ne disposent pas encore d’un vrai système de maillage facial texturé, de segmentation peau/cheveux, de matériaux, de masques d’occlusion ou de rendu GPU spécialisé.

Le principal risque n’est donc pas l’absence totale de branchement. Le branchement existe déjà. Le risque est de modifier plusieurs fichiers centraux sans séparer les responsabilités, ce qui pourrait casser simultanément la caméra, l’enregistrement et l’aperçu. L’intégration doit être faite par couches et par nouveaux modules ciblés.

## 2. Parcours actuel observé

Le composant `Upload` rend `CameraRecorder` pendant l’étape de capture. `CameraRecorder` obtient la caméra et le microphone, puis rend `AREngineMobile`. `AREngineMobile` produit un canvas traité. Ce même canvas est utilisé pour capturer une photo ou pour créer un `MediaStream` vidéo avec `captureStream(30)`.

| Étape | Fichier principal | État constaté |
|---|---|---|
| Accès caméra et microphone | `client/src/components/CameraRecorder.tsx` | Fonctionnel, flux utilisateur avant uniquement par défaut |
| Rendu de la caméra | `client/src/components/AREngineMobile.tsx` | Canvas plein écran avec recadrage cover |
| Détection faciale | `@mediapipe/tasks-vision` et `FaceLandmarker` | Branchée en mode vidéo, un visage, détection environ toutes les 40 ms |
| Stabilisation | `client/src/components/faceUtils.ts` | Lissage exponentiel des landmarks |
| Beauté | `client/src/features/beauty/BeautyPipeline.ts` | Retouche peau, tonalité, yeux et déformations locales |
| Effets créatifs | `client/src/features/beauty/FaceEffects.ts` | Formes Canvas 2D ancrées aux landmarks |
| Sélection | `client/src/components/EffectsPanel.tsx` | Liste horizontale des effets AR et beauté |
| Capture photo | `CameraRecorder` | Export JPEG depuis le canvas traité |
| Capture vidéo | `CameraRecorder` | `captureStream(30)` depuis le canvas traité, audio mixé séparément |
| Publication | `client/src/pages/Upload.tsx` et `Publish.tsx` | Fichier photo ou WebM envoyé dans le parcours existant |

## 3. Ce qui fonctionne déjà

### 3.1 Détection et suivi

Le système utilise `FaceLandmarker` avec le modèle local `face_landmarker.task`. Le script `scripts/prepare-mediapipe.mjs` copie les fichiers WASM dans `client/public/mediapipe/wasm` et télécharge le modèle pendant le build. Le navigateur ne dépend donc pas d’un CDN au moment de l’utilisation, à condition que le build ait correctement préparé ces ressources.

Le moteur évite de traiter deux fois la même position vidéo et limite la détection à environ 25 images par seconde. Les landmarks sont lissés avant d’être utilisés par les effets. Le système gère également les états `loading`, `ready`, `face`, `no-face` et `error`.

### 3.2 Rendu capturable

Le choix architectural le plus important est correct : l’aperçu et la capture utilisent le même canvas traité. Cela évite qu’un effet soit visible à l’écran mais absent de la photo ou de la vidéo enregistrée.

La vidéo source est cachée et le canvas traité est visible. La fonction `drawCover` applique un recadrage portrait cohérent avec l’affichage. La fonction `mapLandmarks` remappe les points du visage dans ce même espace recadré.

### 3.3 Effets déjà disponibles

Le registre `ARRegistry.ts` contient actuellement dix effets beauté et dix effets créatifs environ. Les effets beauté comprennent la peau lissée, le glow, les grands yeux, le visage affiné, les lèvres et la retouche. Les effets créatifs comprennent notamment le chat, le lapin, les lunettes, les cœurs, la couronne, le maquillage, les taches de rousseur, les larmes et le néon.

Le renderer `FaceEffects.ts` sait déjà calculer l’angle de la tête, la géométrie du visage, les centres des yeux, les lèvres et le contour facial. Cette base peut être conservée et étendue.

## 4. Écarts avec l’expérience TikTok demandée

### 4.1 Les miniatures ne montrent pas le visage réel

Les miniatures du panneau sont générées par `svgThumb()`. Elles représentent un visage illustré générique. Elles ne montrent pas le visage de l’utilisateur et ne montrent pas le résultat réel de l’effet sur sa morphologie, sa carnation, sa lumière ou son cadrage.

C’est l’écart principal avec la capture fournie. Dans l’expérience demandée, chaque vignette doit être une **prévisualisation personnalisée** : une image fixe de la caméra, rendue avec l’effet correspondant.

### 4.2 Le panneau ne possède pas de pipeline d’aperçu photo

Le panneau appelle `onSelectEffect` et modifie l’effet actif. Le canvas principal est ensuite mis à jour. Il n’existe pas de mécanisme distinct pour produire une image de référence, appliquer chaque effet à cette image et associer le résultat à une vignette.

Le système actuel fait donc du rendu en direct, mais pas de la génération de vignettes personnalisées.

### 4.3 Les miniatures sont coûteuses à remplacer naïvement

Générer une image complète pour chaque effet à chaque ouverture du panneau serait inefficace. Le système doit capturer une seule image de référence, puis rendre les effets sur un canvas de miniature de faible résolution. Les miniatures doivent être mises en cache par empreinte de l’image et identifiant d’effet.

### 4.4 Les effets sont Canvas 2D, pas des matériaux faciaux

Les effets actuels dessinent des ellipses, polygones, lignes, gradients et ombres. Cette approche convient aux lunettes simples, aux cœurs, aux larmes et aux accessoires stylisés. Elle atteint rapidement ses limites pour un maquillage réaliste, une texture peau, des reflets, des cheveux ou une déformation homogène du visage.

Pour un rendu plus réaliste, il faudra ajouter progressivement un masque facial basé sur les triangles du mesh, des textures de maquillage et des opérations GPU. Cette étape ne doit pas remplacer immédiatement le renderer actuel ; elle doit être ajoutée comme une nouvelle famille de renderer.

### 4.5 La segmentation n’est pas branchée

Le code ne montre pas de segmentation de la peau, des cheveux ou du corps. Le contour facial est utilisé comme masque polygonal, mais ce contour ne distingue pas la peau des cheveux, des oreilles, des lunettes ou de l’arrière-plan. Les effets de teint peuvent donc déborder ou manquer de réalisme selon la lumière et la coiffure.

### 4.6 Le modèle ne produit pas les signaux d’expression nécessaires

`FaceLandmarker` est configuré avec `outputFaceBlendshapes: false` et `outputFacialTransformationMatrixes: false`. Les effets actuels utilisent principalement les landmarks et l’angle des yeux. Cela limite les effets réactifs au sourire, au clignement, à l’ouverture de la bouche, au froncement des sourcils et à la rotation 3D réelle.

Pour un système TikTok-like, les blendshapes et la matrice de transformation doivent être activés dans une phase dédiée, avec mesure de leur coût sur les appareils Android modestes.

### 4.7 La caméra possède deux architectures

`VideoCamera.tsx` est un ancien composant autonome qui capture directement le flux caméra et enregistre le flux original. `CameraRecorder.tsx` est le composant actuellement connecté au parcours `Upload` et utilise le canvas traité. Cette coexistence est un risque de confusion et de régression.

Aucune intégration d’effets ne doit être ajoutée dans `VideoCamera.tsx` tant que son usage réel n’est pas confirmé. Le chemin principal doit rester `Upload` → `CameraRecorder` → `AREngineMobile`.

## 5. Problèmes techniques prioritaires

| Priorité | Problème | Impact | Décision recommandée |
|---|---|---|---|
| P0 | Absence de miniatures personnalisées | L’utilisateur ne voit pas son propre résultat avant de choisir | Créer un pipeline de vignettes basé sur un snapshot caméra |
| P0 | Ressources MediaPipe préparées uniquement au build | Écran AR inutilisable si le script de build n’est pas exécuté | Ajouter un contrôle de disponibilité et un état d’erreur explicite |
| P1 | Pas de segmentation | Maquillage et retouche moins réalistes | Ajouter une segmentation dédiée après stabilisation du pipeline actuel |
| P1 | Blendshapes désactivés | Peu d’effets réactifs aux expressions | Activer et mesurer dans une branche de rendu compatible |
| P1 | Renderer central volumineux | Risque de gonfler un fichier difficile à tester | Extraire les renderers par famille dans de nouveaux modules |
| P2 | Miniatures SVG génériques | Interface peu fidèle à TikTok | Remplacer uniquement l’affichage de la vignette, pas le registre métier |
| P2 | `VideoCamera` et `CameraRecorder` en parallèle | Risque de corriger le mauvais parcours | Documenter ou déprécier le composant non utilisé |
| P2 | Rendu Canvas 2D sur CPU | Performance limitée avec plusieurs effets | Introduire WebGL seulement pour les effets qui le nécessitent |

## 6. Architecture recommandée sans gonfler les fichiers existants

L’intégration doit ajouter des modules ciblés plutôt que transformer `CameraRecorder.tsx`, `AREngineMobile.tsx` et `FaceEffects.ts` en fichiers monolithiques.

```text
client/src/
  components/
    CameraRecorder.tsx                  # orchestration uniquement
    AREngineMobile.tsx                   # boucle caméra et coordination
    effects/
      EffectPreviewStrip.tsx             # panneau de miniatures personnalisées
      EffectPreviewRenderer.ts          # rendu basse résolution d’une vignette
      useEffectPreview.ts                # cache et état de génération
  features/
    ar/
      ARRegistry.ts                      # catalogue et métadonnées
      ARCapabilities.ts                  # capacités par appareil
      preview/
        PreviewSnapshot.ts               # image de référence
        PreviewCache.ts                  # cache mémoire/session
      tracking/
        FaceTrackingTypes.ts             # types landmarks/blendshapes
        FaceTrackingPipeline.ts          # abstraction du suivi
      renderers/
        CanvasFaceRenderer.ts            # effets 2D existants extraits
        FaceMeshRenderer.ts              # futur renderer texturé
        BeautyRenderer.ts                # retouche et maquillage
      segmentation/
        FaceSegmentation.ts              # ajout ultérieur
```

Le registre des effets doit rester déclaratif. Chaque effet devrait décrire son identifiant, sa catégorie, ses paramètres beauté, son renderer, son niveau de performance et son mode d’aperçu. Le panneau ne devrait pas connaître les détails de Canvas, de MediaPipe ou du cache.

## 7. Parcours cible correspondant à la capture

Le parcours cible doit respecter les étapes suivantes.

1. La caméra démarre et affiche le rendu naturel avec la retouche de base.
2. Le moteur capture un snapshot basse résolution du canvas traité.
3. Le panneau affiche une vignette « Naturel » correspondant à ce snapshot.
4. Pour chaque effet visible, le moteur applique l’effet au snapshot avec les mêmes landmarks.
5. Le panneau affiche les résultats personnalisés dans une bande horizontale.
6. Lorsque l’utilisateur choisit une vignette, l’effet devient actif dans le renderer temps réel.
7. La photo et la vidéo sont capturées depuis le même canvas temps réel.
8. Si le visage disparaît, les miniatures restent stables et le rendu temps réel affiche un état explicite.

Le système ne doit pas générer une nouvelle miniature à chaque mouvement de tête. Une vignette doit être régénérée uniquement après un nouveau snapshot, un changement d’orientation important, un changement de caméra ou une demande explicite de rafraîchissement.

## 8. Plan d’intégration par phases

### Phase 0 — Contrat et instrumentation

Créer les types de suivi, mesurer le temps de détection, le temps de rendu, le nombre d’images par seconde et la mémoire consommée. Ajouter des logs désactivables en production. Aucun changement visuel majeur ne doit être fait à cette phase.

### Phase 1 — Aperçu personnalisé des effets

Créer `PreviewSnapshot`, `PreviewCache`, `EffectPreviewRenderer` et `EffectPreviewStrip`. Réutiliser `ARRegistry`, `BeautyPipeline` et `FaceEffects` dans un contexte basse résolution. Cette phase répond directement au besoin montré dans la capture sans changer le moteur de capture.

Les miniatures doivent être créées avec un canvas de petite taille, par exemple 96 à 144 pixels de côté, et doivent être produites avec le même recadrage que l’aperçu principal. Le cache doit utiliser une clé comprenant l’identifiant de l’effet, la caméra et l’empreinte du snapshot.

### Phase 2 — Stabilisation et qualité du visage

Améliorer le masque facial et le lissage. Vérifier les cas de visage sombre, de contre-jour, de lunettes, de barbe, de cheveux couvrant le front et de visage partiellement hors cadre. Les effets beauté doivent préserver les yeux, les lèvres et les contours pertinents.

### Phase 3 — Expressions et pose 3D

Activer les blendshapes et la matrice de transformation. Ajouter des effets qui réagissent au sourire, au clignement et à l’ouverture de la bouche. Cette phase doit inclure un mécanisme de repli si les signaux ne sont pas disponibles ou sont trop coûteux.

### Phase 4 — Rendu avancé

Ajouter un renderer de mesh facial texturé et, si nécessaire, un renderer WebGL. Cette phase doit cibler le maquillage réaliste, les textures, les reflets et les déformations homogènes. Elle doit rester séparée du renderer Canvas 2D existant.

### Phase 5 — Validation multi-appareils

Tester au minimum un appareil Android d’entrée de gamme, un appareil Android récent, un iPhone récent et un navigateur desktop. Mesurer le démarrage caméra, la stabilité du suivi, le délai entre sélection et rendu, la fidélité de la vignette et la conformité de la vidéo exportée.

## 9. Critères d’acceptation

| Domaine | Critère |
|---|---|
| Aperçu | Chaque vignette affiche le visage réel de l’utilisateur, et non une illustration générique |
| Fidélité | L’effet sélectionné dans la vignette correspond au rendu caméra après sélection |
| Capture | La photo exportée contient exactement le rendu visible |
| Vidéo | La vidéo exportée contient l’effet sans décalage de cadrage |
| Suivi | Le visage ne tremble pas de manière visible lors d’un mouvement lent |
| Résilience | La perte temporaire du visage ne casse pas la caméra ni l’enregistrement |
| Performance | Le panneau ne bloque pas la caméra pendant la génération des vignettes |
| Architecture | Aucun fichier existant central ne devient un fichier monolithique supplémentaire |
| Accessibilité | Les effets restent sélectionnables au clavier et disposent d’un nom lisible |
| Données | Les snapshots de prévisualisation restent locaux et ne sont pas envoyés au serveur sans nécessité |

## 10. Décision d’audit

La base actuelle ne doit pas être réécrite. Elle doit être conservée comme moteur de capture et de rendu temps réel, puis complétée par une couche de prévisualisation personnalisée. Le premier développement recommandé est donc **le système de miniatures générées depuis le vrai visage de l’utilisateur**, avant la segmentation et le rendu WebGL.

Cette priorité réduit le risque. Elle répond directement au besoin visible dans la capture. Elle réutilise les branchements existants. Elle permet de valider l’expérience utilisateur avant d’investir dans une refonte graphique plus coûteuse.

## Références

[1]: https://effecthouse.tiktok.com/learn/guides/workspace/objects/face-effects/face-mask "TikTok Effect House Face Mask"

[2]: https://effecthouse.tiktok.com/learn/guides/workspace/assets/downloadable-assets/3d-face "TikTok Effect House 3D Face Mesh"

[3]: https://effecthouse.tiktok.com/learn/guides/workspace/assets/downloadable-assets/3d-face-with-blend-shape "TikTok Effect House 3D Face Mesh with Blend Shape"

[4]: https://effecthouse.tiktok.com/learn/guides/workspace/objects/ar-tracking/head-tracker "TikTok Effect House Head Tracker"

[5]: https://effecthouse.tiktok.com/learn/guides/workspace/assets/texture/segmentation-texture "TikTok Effect House Segmentation Texture"

[6]: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js "MediaPipe Face Landmarker for Web"

[7]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream "MDN HTMLCanvasElement captureStream()"

[8]: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder "MDN MediaRecorder API"

[9]: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia "MDN MediaDevices getUserMedia()"

[10]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API "MDN WebGL API"

[11]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter "MDN CanvasRenderingContext2D filter"

[12]: https://github.com/google-ai-edge/mediapipe "MediaPipe official repository"

---

**Fichiers audités principaux :** `CameraRecorder.tsx`, `AREngineMobile.tsx`, `VideoCamera.tsx`, `EffectsPanel.tsx`, `EffectsLibrary.tsx`, `ARRegistry.ts`, `BeautyPipeline.ts`, `BeautyConfig.ts`, `FaceEffects.ts`, `faceUtils.ts`, `Upload.tsx`, `prepare-mediapipe.mjs` et les flux de publication associés.

**Conclusion opérationnelle :** aucun code n’a été modifié dans cet audit. La prochaine étape doit être validée avant implémentation : construire la couche d’aperçu personnalisé dans de nouveaux fichiers, puis la brancher au panneau d’effets existant.
``` 

