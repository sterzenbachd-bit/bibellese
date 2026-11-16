/* Lesplan der Reihe. Zum Anpassen oder Ersetzen nur diese Datei ändern.
   phases: Name, optional from/to (Einheitsnummern der Phase), optional count (Richtwert). */
window.PLAN = {
  id: 'fortlaufend',
  name: 'Fortlaufende Bibellese',
  phases: [
    { name: 'Matthäus', done: true },
    { name: 'Johannes', done: true },
    { name: 'Genesis 1–22', done: true },
    { name: 'Exodus 1–24', done: true },
    { name: 'Psalmen, Auswahl', from: 33, to: 69 },
    { name: 'Jesaja 40–55', count: 12 },
    { name: 'Römer', count: 16 },
    { name: 'Galater und Epheser', count: 14 },
    { name: '1. Korinther', count: 14 },
    { name: 'Philipper und Kolosser', count: 10 },
    { name: 'Hebräer', count: 12 },
    { name: 'Jakobus, 1. Petrus, 1. Johannes', count: 14 },
    { name: 'Offenbarung, Auswahl', count: 10 }
  ]
};
