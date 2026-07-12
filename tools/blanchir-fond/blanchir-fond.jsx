// blanchir-fond.jsx — ECOS
// Applique UNIQUEMENT le blanchiment de fond de `tools/combine-uniform` à chaque
// image sélectionnée, SANS les combiner : un point blanc Levels (>= WHITE_BRIGHT -> 255)
// qui uniformise les blancs papier des captures de diapo (blanc pur / crème / gris clair)
// tout en préservant l'encre et les couleurs. Un `flatten()` préalable aplatit aussi
// toute transparence PNG sur blanc opaque (convention « fond blanc opaque » des détourés).
//
// Traitement EN PLACE, non destructif : l'original est d'abord copié dans un sous-dossier
// `.backup_blanc/` (jamais écrasé s'il existe déjà) avant d'être remplacé.
//
// Arguments (do javascript) : {chemin1, chemin2, ...}
// Renvoie un résumé "N image(s) blanchie(s)" (+ éventuels ignorés).

var ARGV = (typeof arguments !== "undefined" && arguments) ? arguments : [];

(function (argv) {
    var WHITE_BRIGHT = 205;   // fond >= ce niveau -> blanc pur (identique à combine-uniform.jsx)

    var paths = [];
    for (var i = 0; i < argv.length; i++) {
        var p = String(argv[i]);
        if (p !== "" && p !== "undefined") paths.push(p);
    }
    if (paths.length < 1) { alert("Sélectionnez au moins une image."); return "Aucune image."; }

    var savedDialogs = app.displayDialogs, savedRuler = app.preferences.rulerUnits;
    app.displayDialogs = DialogModes.NO;            // pas de modal (profil couleur…) qui figerait do javascript
    app.preferences.rulerUnits = Units.PIXELS;

    var done = 0, skipped = [];
    try {
        for (i = 0; i < paths.length; i++) {
            var srcFile = new File(paths[i]);
            if (!srcFile.exists) { skipped.push(decodeURI(srcFile.name) + " (introuvable)"); continue; }

            // options d'enregistrement selon l'extension (on reste dans le format d'origine)
            var opt = saveOptionsFor(paths[i]);
            if (opt === null) { skipped.push(decodeURI(srcFile.name) + " (format non géré)"); continue; }

            // backup non destructif : copie l'original dans .backup_blanc/ s'il n'y est pas déjà
            backup(srcFile);

            var doc = null;
            try {
                doc = app.open(srcFile);
                app.activeDocument = doc;
                doc.flatten();                                   // aplatit transparence -> blanc opaque
                // point blanc Levels : tout ce qui est >= WHITE_BRIGHT est ramené vers 255
                doc.activeLayer.adjustLevels(0, WHITE_BRIGHT, 1.0, 0, 255);
                doc.saveAs(srcFile, opt, true, Extension.LOWERCASE);
                doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
                done++;
            } catch (eImg) {
                if (doc) { try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e) {} }
                skipped.push(decodeURI(srcFile.name) + " (" + eImg.message + ")");
            }
        }
    } finally {
        app.displayDialogs = savedDialogs;
        app.preferences.rulerUnits = savedRuler;
    }

    var msg = done + " image(s) blanchie(s).";
    if (skipped.length) msg += "\nIgnorée(s) : " + skipped.join(", ");
    return msg;

    // --- helpers ---

    // Copie l'original dans <dossier>/.backup_blanc/<nom> (créé au besoin), sans jamais
    // écraser un backup existant : on préserve toujours la toute première version.
    function backup(f) {
        try {
            var backDir = new Folder(f.parent.fsName + "/.backup_blanc");
            if (!backDir.exists) backDir.create();
            var b = new File(backDir.fsName + "/" + f.name);
            if (!b.exists) f.copy(b);
        } catch (e) { /* backup best-effort : on ne bloque pas le blanchiment */ }
    }

    // Renvoie les SaveOptions Photoshop correspondant à l'extension, ou null si non géré.
    function saveOptionsFor(path) {
        var ext = path.replace(/^.*\./, "").toLowerCase();
        if (ext === "png") { var o = new PNGSaveOptions(); o.compression = 6; o.interlaced = false; return o; }
        if (ext === "jpg" || ext === "jpeg") { var j = new JPEGSaveOptions(); j.quality = 12; return j; }
        if (ext === "tif" || ext === "tiff") { var t = new TiffSaveOptions(); t.imageCompression = TIFFEncoding.NONE; return t; }
        return null;
    }
})(ARGV);
