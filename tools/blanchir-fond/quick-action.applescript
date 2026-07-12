-- quick-action.applescript — Action rapide « Blanchir le fond (ECOS) »
-- Installée dans : ~/Library/Services/Blanchir-fond-ECOS.workflow
--
-- Applique UNIQUEMENT le blanchiment de fond de tools/combine-uniform (point blanc Levels,
-- WHITE_BRIGHT = 205) à chaque image sélectionnée dans le Finder, SANS les combiner.
-- Traitement en place, non destructif (backup automatique dans .backup_blanc/).
-- Le .jsx fait tout le travail et renvoie un résumé.

on run {input, parameters}
	set jsxPath to "/Users/damienfulliquet/Developer/GitHub/ecos-data/tools/blanchir-fond/blanchir-fond.jsx"
	set scriptText to (read (POSIX file jsxPath) as «class utf8»)

	if (count of input) is less than 1 then
		display dialog "Sélectionnez au moins une image à blanchir." buttons {"OK"} default button "OK" with icon caution with title "Blanchir le fond"
		return input
	end if

	-- arguments : {chemin1, chemin2, ...}
	set argList to {}
	repeat with f in input
		set end of argList to POSIX path of (f as alias)
	end repeat

	try
		tell application "Adobe Photoshop 2026"
			activate
			set res to (do javascript scriptText with arguments argList)
		end tell
		display dialog res buttons {"OK"} default button "OK" with title "Blanchir le fond"
	on error errMsg
		display dialog "Échec du blanchiment :" & return & errMsg buttons {"OK"} default button "OK" with icon stop with title "Blanchir le fond"
	end try
	return input
end run
