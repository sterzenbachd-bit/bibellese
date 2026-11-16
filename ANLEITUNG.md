# Bibellese: Installation und Pflege

## Auf das Android-Handy bringen
1. Alle Dateien dieses Ordners auf einen Webspace mit https legen, zum Beispiel GitHub Pages oder einen eigenen Server. Ohne https lässt sich die App nicht installieren.
2. Die Adresse in Chrome auf dem Handy öffnen.
3. Menü (drei Punkte), dann "App installieren" oder "Zum Startbildschirm hinzufügen".
4. App starten, "Einheit einfügen", "Sammeldatei wählen" und Einheiten_52_bis_56.md auswählen, dann "Übernehmen".

Nach dem ersten Laden läuft die App ohne Netz.

## Neue Einheiten
In der Claude App den Text der Einheit kopieren, in der Bibellese unter "Einheit einfügen" einfügen und übernehmen. Mehrere Einheiten hintereinander oder eine Sammeldatei sind möglich. Vorhandene Nummern werden übersprungen, außer "Vorhandene Einheiten ersetzen" ist angehakt. Eine Einheit beginnt mit einer Zeile wie "# Einheit 57: Psalm 126".

## App aktualisieren
Dateien auf dem Webspace ersetzen und in sw.js die Zeile `const CACHE = 'bibellese-1.0.0';` hochzählen. Beim nächsten Start mit Netz lädt die App die neue Fassung.

## Lesplan ändern
Nur plan.js bearbeiten (Phasen, Einheitsnummern von/bis).

## Eigene Bibeltext-Dateien
Einstellungen, "Bibeltext-Datei importieren". Format (JSON, Buchkürzel wie in den Einheiten: Ps, Mk, Mt, Joh, Hes, Offb, Jes, Jon, 2 Kor ...):

{"id":"luther","name":"Lutherbibel 2017","short":"LUT","books":{"Ps":{"46":{"2":"Gott ist unsere Zuflucht ...","3":"..."}}}}

Die id "luther", "schlachter", "nl" oder "web" belegt die vorgesehene Übersetzung, jede andere id erscheint als eigene Auswahl. Fehlt eine Stelle in der Datei, zeigt die App den Text der Einheit.

## Sicherung
Einstellungen, "Sicherung speichern" legt Einheiten, Lesestand und Einstellungen in eine Datei. "Sicherung wiederherstellen" spielt sie zurück.
