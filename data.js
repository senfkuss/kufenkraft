// Trainingsplan: zwei Ganzkörpereinheiten (A und B), je ca. 30 Minuten.
const REST = 45; // Pause zwischen den Sätzen in Sekunden

const WARMUP = [
  { n: 'Sprunggelenke kreisen, beide Seiten', s: 40 },
  { n: 'Hüftkreisen im Stand', s: 40 },
  { n: 'Katze-Kuh im Vierfüßlerstand', s: 50 },
  { n: 'Lockere Kniebeugen', s: 50 },
  { n: 'Armkreisen und Schulterrollen', s: 40 },
];
const COOLDOWN = [
  { n: 'Hüftbeuger dehnen, links', s: 40 },
  { n: 'Hüftbeuger dehnen, rechts', s: 40 },
  { n: 'Kindhaltung, ruhig atmen', s: 50 },
  { n: 'Waden dehnen an der Wand, beide Seiten', s: 50 },
];

const EX = {
  split: {
    name: 'Split-Kniebeuge', block: 'Kraft', muscles: 'Oberschenkel, Gesäß', sets: 3, side: true, unit: 'Wdh',
    levels: [
      { n: 'Split-Kniebeuge', min: 8, max: 12,
        cue: ['Großer Schritt, hintere Ferse bleibt oben', 'Senkrecht absenken, bis das hintere Knie fast den Boden berührt', 'Vorderes Knie zeigt über die Fußmitte'],
        fig: [
          { head: [59, 19], neck: [58, 30], hip: [58, 60], aL: [[50, 46], [57, 57]], aR: [[52, 46], [59, 57]],
            lL: [[70, 82], [76, 108]], lR: [[48, 83], [34, 104], [31, 110]], hl: ['thighL', 'thighR'], arrow: [92, 40, 92, 66] },
          { head: [57, 38], neck: [56, 49], hip: [55, 79], aL: [[47, 65], [54, 76]], aR: [[49, 65], [56, 76]],
            lL: [[78, 83], [76, 108]], lR: [[46, 102], [25, 103], [22, 110]], hl: ['thighL', 'thighR'], arrow: [92, 70, 92, 46] },
        ] },
      { n: 'Bulgarische Split-Kniebeuge (hinterer Fuß auf dem Stuhl)', min: 6, max: 10,
        cue: ['Fußrücken auf die Stuhlkante legen', 'Gewicht bleibt auf dem vorderen Bein', 'Oberkörper leicht nach vorn geneigt'] },
      { n: 'Bulgarische Split-Kniebeuge, 3 Sekunden absenken', min: 6, max: 10,
        cue: ['Drei Sekunden abwärts zählen', 'Unten kurz halten, dann zügig hochdrücken'] },
      { n: 'Einbeinige Kniebeuge auf den Stuhl', min: 5, max: 8,
        cue: ['Auf einem Bein langsam auf die Stuhlkante setzen', 'Ohne Schwung wieder aufstehen', 'Freies Bein nach vorn strecken'] },
    ],
  },
  rudern: {
    name: 'Rudern mit Teraband', block: 'Kraft', muscles: 'Rücken, Armbeuger', sets: 3, side: false, unit: 'Wdh',
    levels: [
      { n: 'Rudern im Sitzen', min: 10, max: 15,
        cue: ['Band um beide Füße legen, Rücken lang', 'Ellbogen eng am Körper nach hinten ziehen', 'Schulterblätter am Ende zusammenführen, langsam zurück'],
        fig: [
          { head: [47, 58], neck: [45, 69], hip: [38, 99], aL: [[58, 79], [72, 84]], aR: [[59, 78], [73, 83]],
            lL: [[63, 95], [88, 102], [90, 94]], lR: [[64, 94], [89, 101], [91, 93]], hl: ['torso'],
            props: [{ t: 'band', pts: [[72, 84], [89, 97]] }], arrow: [68, 70, 50, 70] },
          { head: [40, 57], neck: [39, 68], hip: [38, 99], aL: [[28, 86], [44, 87]], aR: [[30, 85], [46, 86]],
            lL: [[63, 95], [88, 102], [90, 94]], lR: [[64, 94], [89, 101], [91, 93]], hl: ['torso', 'armL'],
            props: [{ t: 'band', pts: [[44, 87], [89, 97]] }], arrow: [52, 70, 70, 70] },
        ] },
      { n: 'Vorgebeugtes Rudern im Stand (Band unter den Füßen)', min: 10, max: 15,
        cue: ['Hüfte nach hinten schieben, Rücken gerade', 'Beide Bandenden zur Taille ziehen'] },
      { n: 'Einarmiges Rudern im Ausfallschritt', min: 8, max: 12,
        cue: ['Band unter dem vorderen Fuß', 'Rumpf bleibt ruhig, nicht mitdrehen'] },
    ],
  },
  liege: {
    name: 'Liegestütz', block: 'Kraft', muscles: 'Brust, Schultern, Trizeps', sets: 3, side: false, unit: 'Wdh',
    levels: [
      { n: 'Liegestütz mit erhöhten Händen (Tisch oder Stuhl)', min: 8, max: 12, cue: ['Körper bildet eine Linie von Kopf bis Ferse', 'Brust zur Kante absenken, Ellbogen etwa 45 Grad vom Körper'],
        fig: [
          { head: [86, 45], neck: [79, 53], hip: [56, 74], aL: [[83, 66], [88, 80]], aR: [[85, 66], [90, 80]],
            lL: [[39, 91], [22, 105], [25, 111]], lR: [[41, 91], [24, 105], [27, 111]], hl: ['armL', 'torso'], props: [{ t: 'line', pts: [[86, 112], [86, 83], [106, 83], [106, 112]] }, { t: 'line', pts: [[106, 83], [108, 56]] }], arrow: [58, 36, 64, 50] },
          { head: [99, 64], neck: [91, 71], hip: [64, 86], aL: [[79, 77], [88, 80]], aR: [[81, 76], [90, 80]],
            lL: [[43, 97], [22, 105], [25, 111]], lR: [[45, 97], [24, 105], [27, 111]], hl: ['armL', 'torso'], props: [{ t: 'line', pts: [[86, 112], [86, 83], [106, 83], [106, 112]] }, { t: 'line', pts: [[106, 83], [108, 56]] }], arrow: [72, 60, 66, 46] },
        ] },
      { n: 'Liegestütz auf den Knien', min: 8, max: 12, cue: ['Hüfte bleibt gestreckt', 'Brust bis knapp über den Boden'] },
      { n: 'Klassischer Liegestütz', min: 5, max: 10, cue: ['Bauch und Gesäß fest anspannen', 'Volle Bewegung, keine halben Wiederholungen'] },
      { n: 'Liegestütz, 3 Sekunden absenken', min: 5, max: 8, cue: ['Drei Sekunden abwärts zählen', 'Zügig hochdrücken'] },
    ],
  },
  plank: {
    name: 'Unterarmstütz', block: 'Kraft', muscles: 'Rumpf', sets: 3, side: false, unit: 's',
    levels: [
      { n: 'Unterarmstütz', min: 20, max: 40, cue: ['Ellbogen unter den Schultern', 'Becken leicht einrollen, nicht durchhängen'],
        fig: [
          { label: 'Halten', head: [94, 86], neck: [84, 90], hip: [55, 97], aL: [[84, 107], [99, 107]], aR: [[86, 107], [101, 107]],
            lL: [[31, 102], [9, 104], [11, 111]], lR: [[33, 102], [11, 104], [13, 111]], hl: ['torso'] },
        ] },
      { n: 'Unterarmstütz mit abwechselndem Beinheben', min: 20, max: 40, cue: ['Ein Fuß hebt wenige Zentimeter ab', 'Becken bleibt ruhig'] },
      { n: 'Seitstütz, je Seite', min: 15, max: 30, cue: ['Ellbogen unter der Schulter', 'Hüfte hoch, Körper in einer Linie'] },
    ],
  },
  gleit: {
    name: 'Gleithaltung auf einem Bein', block: 'Eislauf', muscles: 'Balance, Hüftstabilität', sets: 2, side: true, unit: 's',
    levels: [
      { n: 'Gleithaltung halten, Augen offen', min: 20, max: 30,
        cue: ['Standbein leicht gebeugt, wie beim Gleiten', 'Freies Bein lang nach hinten, Becken gerade', 'Arme seitlich, Blick nach vorn'],
        fig: [
          { head: [61, 21], neck: [60, 32], hip: [60, 62], aL: [[69, 45], [80, 52]], aR: [[51, 45], [40, 52]],
            lL: [[65, 85], [60, 108]], lR: [[58, 85], [46, 102], [50, 109]], hl: ['thighL', 'shinL'], arrow: [36, 98, 16, 82, 0.2] },
          { head: [78, 31], neck: [72, 40], hip: [58, 66], aL: [[84, 50], [98, 50]], aR: [[60, 40], [46, 36]],
            lL: [[65, 87], [60, 108]], lR: [[36, 72], [14, 76], [8, 81]], hl: ['thighL', 'shinL'] },
        ] },
      { n: 'Gleithaltung mit Kopfdrehen', min: 20, max: 30, cue: ['Kopf langsam nach links und rechts drehen', 'Standbein bleibt gebeugt'] },
      { n: 'Gleithaltung mit geschlossenen Augen', min: 15, max: 30, cue: ['Neben einer Wand oder einem Stuhl üben', 'Augen schließen, ruhig weiteratmen'] },
    ],
  },
  skater: {
    name: 'Skater-Sprünge', block: 'Eislauf', muscles: 'Sprungkraft, Landung', sets: 2, side: true, unit: 'Wdh',
    levels: [
      { n: 'Seitlicher Schritt-Sprung, Landung 2 Sekunden halten', min: 5, max: 8, cue: ['Seitlich abdrücken, auf dem anderen Bein landen', 'Weich im Knie abfedern, Knie zeigt nach vorn', 'Landung zwei Sekunden ruhig halten'],
        fig: [
          { label: 'Absprung', front: true, head: [36, 27], neck: [38, 38], hip: [42, 66], aL: [[30, 50], [40, 58]], aR: [[50, 48], [58, 56]],
            lL: [[38, 86], [42, 108], [38, 108]], lR: [[54, 84], [62, 98], [66, 100]], hl: ['thighL', 'shinL'], arrow: [52, 24, 86, 24, -0.25] },
          { label: 'Landung halten', front: true, head: [84, 27], neck: [82, 38], hip: [78, 66], aL: [[90, 50], [80, 58]], aR: [[70, 48], [62, 56]],
            lL: [[82, 86], [78, 108], [82, 108]], lR: [[66, 84], [58, 98], [54, 100]], hl: ['thighL', 'shinL'] },
        ] },
      { n: 'Weiterer Sprung, Landung 3 Sekunden halten', min: 5, max: 8, cue: ['Sprungweite steigern', 'Leise landen'] },
      { n: 'Skater-Sprünge fließend', min: 8, max: 12, cue: ['Ohne Pause von Seite zu Seite', 'Tief bleiben wie beim Übersetzen'] },
    ],
  },
  kreuz: {
    name: 'Einbeiniges Kreuzheben', block: 'Kraft', muscles: 'Beinrückseite, Gesäß, Rücken', sets: 3, side: true, unit: 'Wdh',
    levels: [
      { n: 'Einbeiniges Kreuzheben mit Abstützen', min: 8, max: 12, cue: ['Eine Hand leicht an Wand oder Stuhl', 'Hüfte nach hinten, Rücken gerade, freies Bein als Verlängerung', 'Aus dem Gesäß aufrichten'],
        fig: [
          { head: [61, 21], neck: [60, 32], hip: [60, 62], aL: [[60, 48], [62, 62]], aR: [[80, 42], [100, 46]],
            lL: [[62, 85], [60, 108]], lR: [[58, 85], [54, 104], [60, 108]], hl: ['thighL'], props: [{ t: 'line', pts: [[104, 16], [104, 112]] }], arrow: [72, 16, 88, 30, -0.2] },
          { head: [91, 44], neck: [82, 49], hip: [56, 64], aL: [[80, 66], [80, 80]], aR: [[90, 52], [100, 50]],
            lL: [[60, 86], [60, 108]], lR: [[35, 76], [14, 88], [9, 93]], hl: ['thighL'], props: [{ t: 'line', pts: [[104, 16], [104, 112]] }] },
        ] },
      { n: 'Einbeiniges Kreuzheben frei', min: 8, max: 12, cue: ['Ohne Abstützen', 'Becken bleibt parallel zum Boden'] },
      { n: 'Einbeiniges Kreuzheben mit Teraband', min: 8, max: 12, cue: ['Band unter dem Standfuß, Enden in den Händen', 'Gegen den Bandzug aufrichten'] },
    ],
  },
  bruecke: {
    name: 'Beckenheben', block: 'Kraft', muscles: 'Gesäß, Beinrückseite', sets: 3, side: false, unit: 'Wdh',
    levels: [
      { n: 'Beckenheben beidbeinig, oben 2 Sekunden halten', min: 12, max: 15, cue: ['Fersen in den Boden drücken', 'Hüfte ganz strecken, Gesäß fest anspannen'],
        fig: [
          { head: [17, 102], neck: [27, 104], hip: [58, 104], aL: [[42, 108], [56, 109]], aR: [[42, 107], [56, 108]],
            lL: [[76, 86], [88, 107]], lR: [[78, 85], [90, 107]], hl: ['thighL', 'thighR'], arrow: [58, 90, 58, 72] },
          { head: [17, 102], neck: [27, 104], hip: [58, 88], aL: [[42, 108], [56, 109]], aR: [[42, 107], [56, 108]],
            lL: [[82, 80], [88, 107]], lR: [[84, 79], [90, 107]], hl: ['thighL', 'thighR'] },
        ] },
      { n: 'Beckenheben einbeinig, je Seite', min: 8, max: 12, cue: ['Ein Bein gestreckt in der Luft', 'Becken bleibt gerade'] },
      { n: 'Beckenheben einbeinig, Fuß auf dem Stuhl', min: 8, max: 12, cue: ['Ferse auf die Stuhlkante', 'Langsam absenken'] },
    ],
  },
  pull: {
    name: 'Band auseinanderziehen', block: 'Kraft', muscles: 'Oberer Rücken, hintere Schulter', sets: 3, side: false, unit: 'Wdh',
    levels: [
      { n: 'Band vor der Brust auseinanderziehen', min: 12, max: 15, cue: ['Arme gestreckt auf Schulterhöhe', 'Band zur Brust ziehen, Schulterblätter zusammen', 'Schultern bleiben tief'],
        fig: [
          { front: true, head: [60, 20], neck: [60, 31], hip: [60, 64], aL: [[50, 44], [55, 48]], aR: [[70, 44], [65, 48]], lL: [[52, 86], [50, 108], [46, 108]], lR: [[68, 86], [70, 108], [74, 108]],
            props: [{ t: 'band', pts: [[55, 48], [65, 48]] }], arrow: [76, 54, 98, 54] },
          { front: true, head: [60, 20], neck: [60, 31], hip: [60, 64], aL: [[43, 37], [25, 38]], aR: [[77, 37], [95, 38]], lL: [[52, 86], [50, 108], [46, 108]], lR: [[68, 86], [70, 108], [74, 108]],
            hl: ['armL', 'armR', 'torso'], props: [{ t: 'band', pts: [[25, 38], [95, 38]] }] },
        ] },
      { n: 'Band kürzer greifen oder doppelt nehmen', min: 12, max: 15, cue: ['Mehr Widerstand, gleiche saubere Bewegung'] },
      { n: 'Band über Kopf nach unten hinter den Nacken ziehen', min: 10, max: 15, cue: ['Arme über Kopf, Band auf Spannung', 'Ellbogen seitlich nach unten ziehen'] },
    ],
  },
  waden: {
    name: 'Wadenheben', block: 'Kraft', muscles: 'Waden, Sprunggelenk', sets: 3, side: false, unit: 'Wdh',
    levels: [
      { n: 'Wadenheben beidbeinig, langsam', min: 12, max: 20, cue: ['Hoch auf die Zehenspitzen, oben kurz halten', 'Drei Sekunden absenken'],
        fig: [
          { head: [61, 21], neck: [60, 32], hip: [60, 62], aL: [[74, 46], [90, 42]], aR: [[76, 45], [91, 41]],
            lL: [[61, 85], [60, 108]], lR: [[63, 85], [62, 108]], hl: ['shinL', 'shinR'], props: [{ t: 'line', pts: [[95, 12], [95, 112]] }], arrow: [38, 62, 38, 44] },
          { head: [61, 13], neck: [60, 24], hip: [60, 54], aL: [[74, 40], [90, 40]], aR: [[76, 39], [91, 39]],
            lL: [[61, 77], [60, 100], [67, 109]], lR: [[63, 77], [62, 100], [69, 109]], hl: ['shinL', 'shinR'], props: [{ t: 'line', pts: [[95, 12], [95, 112]] }] },
        ] },
      { n: 'Wadenheben einbeinig, je Seite', min: 8, max: 15, cue: ['Leicht an der Wand abstützen', 'Volle Höhe, langsames Absenken'] },
      { n: 'Wadenheben einbeinig an der Stufe', min: 8, max: 15, cue: ['Ferse unter Stufenniveau absenken', 'Ruhig und kontrolliert'] },
    ],
  },
  seit: {
    name: 'Seitschritte mit Band', block: 'Eislauf', muscles: 'Seitliche Hüfte, Kantenstabilität', sets: 2, side: true, unit: 'Wdh',
    levels: [
      { n: 'Seitschritte, Band über den Knien', min: 10, max: 15, cue: ['Leicht in die Knie, Oberkörper aufrecht', 'Seitlich treten, Band bleibt auf Spannung', 'Knie fallen nicht nach innen'],
        fig: [
          { front: true, head: [60, 26], neck: [60, 37], hip: [60, 66], aL: [[47, 50], [56, 62]], aR: [[73, 50], [64, 62]],
            lL: [[50, 85], [50, 108], [46, 108]], lR: [[70, 85], [70, 108], [74, 108]], hl: ['thighL', 'thighR'],
            props: [{ t: 'band', pts: [[49, 80], [71, 80]] }], arrow: [82, 96, 104, 96] },
          { front: true, head: [66, 26], neck: [66, 37], hip: [66, 66], aL: [[53, 50], [62, 62]], aR: [[79, 50], [70, 62]],
            lL: [[52, 85], [50, 108], [46, 108]], lR: [[84, 85], [88, 108], [92, 108]], hl: ['thighL', 'thighR'],
            props: [{ t: 'band', pts: [[52, 80], [84, 80]] }] },
        ] },
      { n: 'Seitschritte, Band um die Fußgelenke', min: 10, max: 15, cue: ['Längerer Hebel, gleiche tiefe Haltung'] },
      { n: 'Seitschritte tief, Band um die Fußgelenke', min: 10, max: 15, cue: ['Tiefe Laufhaltung halten', 'Kleine, kontrollierte Schritte'] },
    ],
  },
  lande: {
    name: 'Sprung mit einbeiniger Landung', block: 'Eislauf', muscles: 'Landehaltung, Knie- und Hüftkontrolle', sets: 2, side: true, unit: 'Wdh',
    levels: [
      { n: 'Beidbeinig abspringen, einbeinig landen und halten', min: 5, max: 8, cue: ['Kleiner Sprung nach oben', 'Auf einem Bein weich landen, freies Bein nach hinten', 'Drei Sekunden in der Landehaltung bleiben'],
        fig: [
          { label: 'Absprung', head: [72, 40], neck: [66, 50], hip: [52, 76], aL: [[56, 63], [45, 72]], aR: [[58, 63], [47, 72]],
            lL: [[70, 86], [60, 108]], lR: [[72, 85], [62, 108]], hl: ['thighL', 'thighR'], arrow: [88, 60, 88, 34] },
          { label: 'Landung halten', head: [69, 32], neck: [64, 42], hip: [56, 70], aL: [[78, 50], [92, 48]], aR: [[52, 46], [40, 40]],
            lL: [[67, 89], [58, 108]], lR: [[40, 82], [22, 86], [16, 91]], hl: ['thighL', 'shinL'] },
        ] },
      { n: 'Einbeinig abspringen und landen', min: 5, max: 8, cue: ['Gleiches Bein springt und landet', 'Leise landen, Knie stabil'] },
      { n: 'Sprung mit Vierteldrehung, einbeinige Landung', min: 4, max: 6, cue: ['Vierteldrehung in der Luft', 'Landehaltung drei Sekunden halten'] },
    ],
  },
};

const WORKOUTS = {
  A: { name: 'Einheit A', sub: 'Beine vorn, Rücken, Brust, Rumpf', ex: ['split', 'rudern', 'liege', 'plank', 'gleit', 'skater'] },
  B: { name: 'Einheit B', sub: 'Beinrückseite, Gesäß, Schultern, Waden', ex: ['kreuz', 'bruecke', 'pull', 'waden', 'seit', 'lande'] },
};

const FREE_KINDS = ['YouTube-Workout', 'Eiszeit', 'Yoga oder Dehnen', 'Ausdauer', 'Sonstiges'];
