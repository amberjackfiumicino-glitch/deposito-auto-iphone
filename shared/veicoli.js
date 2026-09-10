// Elenco marche e modelli per le tendine di inserimento (stile portali auto).
// Modulo puro: nessun import, nessun DOM.
// I campi restano LIBERI: se un modello non è in elenco lo si scrive a mano.

export const MARCHE = [
  { nome: 'Abarth', modelli: ['500', '595', '695', '124 Spider', 'Grande Punto', 'Punto Evo'] },
  { nome: 'Alfa Romeo', modelli: ['147', '156', '159', '166', 'Brera', 'Giulia', 'Giulietta', 'GT', 'GTV', 'Junior', 'MiTo', 'Spider', 'Stelvio', 'Tonale', '4C', '8C'] },
  { nome: 'Alpine', modelli: ['A110', 'A290'] },
  { nome: 'Aston Martin', modelli: ['DB9', 'DB11', 'DB12', 'DBS', 'DBX', 'Rapide', 'Vantage', 'Vanquish'] },
  { nome: 'Audi', modelli: ['A1', 'A2', 'A3', 'A4', 'A4 Allroad', 'A5', 'A6', 'A6 Allroad', 'A7', 'A8', 'e-tron', 'e-tron GT', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q6 e-tron', 'Q7', 'Q8', 'R8', 'RS3', 'RS4', 'RS6', 'RS Q3', 'S3', 'S4', 'S5', 'TT'] },
  { nome: 'Bentley', modelli: ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne'] },
  { nome: 'BMW', modelli: ['Serie 1', 'Serie 2', 'Serie 2 Active Tourer', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 6', 'Serie 7', 'Serie 8', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX2', 'iX3', 'M2', 'M3', 'M4', 'M5', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4'] },
  { nome: 'BYD', modelli: ['Atto 3', 'Dolphin', 'Han', 'Seal', 'Seal U', 'Sealion 7', 'Tang'] },
  { nome: 'Cadillac', modelli: ['ATS', 'CTS', 'Escalade', 'Lyriq', 'SRX', 'XT4'] },
  { nome: 'Chevrolet', modelli: ['Aveo', 'Camaro', 'Captiva', 'Corvette', 'Cruze', 'Kalos', 'Matiz', 'Orlando', 'Spark', 'Trax'] },
  { nome: 'Chrysler', modelli: ['300C', 'Grand Voyager', 'PT Cruiser', 'Sebring', 'Voyager'] },
  { nome: 'Citroën', modelli: ['Berlingo', 'C1', 'C2', 'C3', 'C3 Aircross', 'C3 Picasso', 'C4', 'C4 Cactus', 'C4 Picasso', 'C4 X', 'C5', 'C5 Aircross', 'C5 X', 'C6', 'C8', 'DS3', 'DS4', 'DS5', 'Jumper', 'Jumpy', 'Nemo', 'Saxo', 'Spacetourer', 'Xsara'] },
  { nome: 'Cupra', modelli: ['Ateca', 'Born', 'Formentor', 'Leon', 'Tavascan', 'Terramar'] },
  { nome: 'Dacia', modelli: ['Dokker', 'Duster', 'Jogger', 'Lodgy', 'Logan', 'Sandero', 'Sandero Stepway', 'Spring'] },
  { nome: 'Daihatsu', modelli: ['Cuore', 'Materia', 'Sirion', 'Terios', 'Trevis'] },
  { nome: 'Dodge', modelli: ['Caliber', 'Challenger', 'Charger', 'Journey', 'Nitro', 'RAM'] },
  { nome: 'DR', modelli: ['DR 3', 'DR 4', 'DR 5', 'DR 6', 'DR 7', 'F35', 'Zero'] },
  { nome: 'DS Automobiles', modelli: ['DS 3', 'DS 3 Crossback', 'DS 4', 'DS 7', 'DS 9'] },
  { nome: 'Ferrari', modelli: ['296', '458', '488', '812', 'California', 'F8', 'FF', 'GTC4Lusso', 'Portofino', 'Purosangue', 'Roma', 'SF90'] },
  { nome: 'Fiat', modelli: ['500', '500C', '500L', '500X', '500e', '600', 'Bravo', 'Croma', 'Doblò', 'Ducato', 'Fiorino', 'Freemont', 'Grande Panda', 'Grande Punto', 'Idea', 'Multipla', 'Panda', 'Punto', 'Punto Evo', 'Qubo', 'Scudo', 'Sedici', 'Seicento', 'Stilo', 'Talento', 'Tipo', 'Ulysse'] },
  { nome: 'Ford', modelli: ['B-Max', 'C-Max', 'EcoSport', 'Edge', 'Explorer', 'Fiesta', 'Focus', 'Fusion', 'Galaxy', 'Ka', 'Ka+', 'Kuga', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Ranger', 'S-Max', 'Tourneo Connect', 'Tourneo Courier', 'Tourneo Custom', 'Transit', 'Transit Connect', 'Transit Courier', 'Transit Custom'] },
  { nome: 'Honda', modelli: ['Accord', 'City', 'Civic', 'CR-V', 'CR-Z', 'e:Ny1', 'HR-V', 'Insight', 'Jazz', 'Legend', 'S2000', 'ZR-V'] },
  { nome: 'Hyundai', modelli: ['Bayon', 'Getz', 'i10', 'i20', 'i30', 'i40', 'Inster', 'IONIQ', 'IONIQ 5', 'IONIQ 6', 'ix20', 'ix35', 'Kona', 'Matrix', 'Santa Fe', 'Tucson'] },
  { nome: 'Infiniti', modelli: ['Q30', 'Q50', 'Q60', 'QX30', 'QX70'] },
  { nome: 'Isuzu', modelli: ['D-Max', 'Trooper'] },
  { nome: 'Iveco', modelli: ['Daily', 'Eurocargo', 'Massif', 'S-Way', 'Stralis', 'Trakker'] },
  { nome: 'Jaguar', modelli: ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'S-Type', 'X-Type', 'XE', 'XF', 'XJ'] },
  { nome: 'Jeep', modelli: ['Avenger', 'Cherokee', 'Commander', 'Compass', 'Gladiator', 'Grand Cherokee', 'Patriot', 'Renegade', 'Wrangler'] },
  { nome: 'Kia', modelli: ['Carens', 'Ceed', 'EV3', 'EV6', 'EV9', 'Niro', 'Picanto', 'ProCeed', 'Rio', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Stonic', 'Venga', 'XCeed'] },
  { nome: 'Lada', modelli: ['Niva', 'Vesta'] },
  { nome: 'Lamborghini', modelli: ['Aventador', 'Gallardo', 'Huracán', 'Revuelto', 'Urus'] },
  { nome: 'Lancia', modelli: ['Delta', 'Musa', 'Phedra', 'Thema', 'Thesis', 'Voyager', 'Y', 'Ypsilon'] },
  { nome: 'Land Rover', modelli: ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'] },
  { nome: 'Leapmotor', modelli: ['B10', 'C10', 'T03'] },
  { nome: 'Lexus', modelli: ['CT', 'ES', 'GS', 'IS', 'LBX', 'LC', 'LS', 'NX', 'RX', 'RZ', 'UX'] },
  { nome: 'Lotus', modelli: ['Elise', 'Eletre', 'Emira', 'Evora', 'Exige'] },
  { nome: 'Maserati', modelli: ['Ghibli', 'GranCabrio', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'] },
  { nome: 'Mazda', modelli: ['2', '3', '5', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-7', 'CX-80', 'MX-30', 'MX-5', 'RX-8'] },
  { nome: 'Mercedes-Benz', modelli: ['Classe A', 'Classe B', 'Classe C', 'Classe E', 'Classe G', 'Classe S', 'Citan', 'CLA', 'CLK', 'CLS', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'EQV', 'GLA', 'GLB', 'GLC', 'GLE', 'GLK', 'GLS', 'ML', 'SL', 'SLC', 'SLK', 'Sprinter', 'Vaneo', 'Viano', 'Vito'] },
  { nome: 'MG', modelli: ['HS', 'Marvel R', 'MG3', 'MG4', 'MG5', 'ZS'] },
  { nome: 'MINI', modelli: ['Clubman', 'Countryman', 'Mini', 'Mini Cabrio', 'Mini Electric', 'Paceman', 'Roadster'] },
  { nome: 'Mitsubishi', modelli: ['ASX', 'Colt', 'Eclipse Cross', 'L200', 'Lancer', 'Outlander', 'Pajero', 'Space Star'] },
  { nome: 'Nissan', modelli: ['350Z', '370Z', 'Ariya', 'Cube', 'Juke', 'Leaf', 'Micra', 'Murano', 'Navara', 'Note', 'NV200', 'Pathfinder', 'Primastar', 'Pulsar', 'Qashqai', 'Townstar', 'X-Trail'] },
  { nome: 'Omoda', modelli: ['5', '7', '9'] },
  { nome: 'Opel', modelli: ['Adam', 'Agila', 'Ampera', 'Antara', 'Astra', 'Combo', 'Corsa', 'Crossland', 'Frontera', 'Grandland', 'Insignia', 'Karl', 'Meriva', 'Mokka', 'Movano', 'Vivaro', 'Zafira'] },
  { nome: 'Peugeot', modelli: ['106', '107', '108', '2008', '206', '207', '208', '3008', '301', '306', '307', '308', '4007', '4008', '406', '407', '408', '5008', '508', '806', '807', 'Bipper', 'Boxer', 'Expert', 'Partner', 'RCZ', 'Rifter', 'Traveller'] },
  { nome: 'Polestar', modelli: ['1', '2', '3', '4'] },
  { nome: 'Porsche', modelli: ['718 Boxster', '718 Cayman', '911', 'Boxster', 'Cayenne', 'Cayman', 'Macan', 'Panamera', 'Taycan'] },
  { nome: 'Renault', modelli: ['Arkana', 'Austral', 'Captur', 'Clio', 'Espace', 'Express', 'Grand Scenic', 'Kadjar', 'Kangoo', 'Koleos', 'Laguna', 'Master', 'Megane', 'Megane E-Tech', 'Modus', 'Rafale', 'Scenic', 'Symbioz', 'Talisman', 'Trafic', 'Twingo', 'Twizy', 'Wind', 'ZOE'] },
  { nome: 'Rolls-Royce', modelli: ['Cullinan', 'Dawn', 'Ghost', 'Phantom', 'Spectre', 'Wraith'] },
  { nome: 'Saab', modelli: ['9-3', '9-5'] },
  { nome: 'SEAT', modelli: ['Alhambra', 'Altea', 'Arona', 'Ateca', 'Exeo', 'Ibiza', 'Leon', 'Mii', 'Tarraco', 'Toledo'] },
  { nome: 'Škoda', modelli: ['Citigo', 'Elroq', 'Enyaq', 'Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Rapid', 'Roomster', 'Scala', 'Superb', 'Yeti'] },
  { nome: 'Smart', modelli: ['#1', '#3', 'ForFour', 'ForTwo', 'Roadster'] },
  { nome: 'SsangYong', modelli: ['Actyon', 'Korando', 'Kyron', 'Rexton', 'Tivoli', 'Torres'] },
  { nome: 'Subaru', modelli: ['BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'Trezia', 'XV'] },
  { nome: 'Suzuki', modelli: ['Across', 'Alto', 'Baleno', 'Celerio', 'Grand Vitara', 'Ignis', 'Jimny', 'S-Cross', 'Splash', 'Swace', 'Swift', 'SX4', 'Vitara'] },
  { nome: 'Tesla', modelli: ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'] },
  { nome: 'Toyota', modelli: ['Auris', 'Avensis', 'Aygo', 'Aygo X', 'bZ4X', 'C-HR', 'Corolla', 'Corolla Cross', 'GR86', 'GR Yaris', 'Hilux', 'Land Cruiser', 'Mirai', 'Prius', 'Proace', 'Proace City', 'RAV4', 'Supra', 'Urban Cruiser', 'Verso', 'Yaris', 'Yaris Cross'] },
  { nome: 'Volkswagen', modelli: ['Amarok', 'Arteon', 'Beetle', 'Caddy', 'California', 'Caravelle', 'Crafter', 'Eos', 'Fox', 'Golf', 'Golf Plus', 'Golf Sportsvan', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz', 'Jetta', 'Multivan', 'New Beetle', 'Passat', 'Polo', 'Scirocco', 'Sharan', 'T-Cross', 'T-Roc', 'Taigo', 'Tiguan', 'Touareg', 'Touran', 'Transporter', 'up!'] },
  { nome: 'Volvo', modelli: ['C30', 'C40', 'EC40', 'EX30', 'EX40', 'EX90', 'S40', 'S60', 'S80', 'S90', 'V40', 'V50', 'V60', 'V70', 'V90', 'XC40', 'XC60', 'XC70', 'XC90'] },

  // --- veicoli commerciali e industriali ---
  { nome: 'DAF', modelli: ['CF', 'LF', 'XF', 'XG'] },
  { nome: 'MAN', modelli: ['TGE', 'TGL', 'TGM', 'TGS', 'TGX'] },
  { nome: 'Piaggio', modelli: ['Ape', 'Porter', 'Porter Maxxi', 'Porter NP6'] },
  { nome: 'Renault Trucks', modelli: ['D', 'Master', 'T', 'T High'] },
  { nome: 'Scania', modelli: ['P Series', 'R Series', 'S Series'] },
  { nome: 'Volvo Trucks', modelli: ['FE', 'FH', 'FL', 'FM'] },

  // --- camper e caravan ---
  { nome: 'Adria', modelli: ['Compact', 'Coral', 'Matrix', 'Sonic', 'Twin'] },
  { nome: 'Hymer', modelli: ['B-Klasse', 'Exsis', 'Grand Canyon', 'ML-T'] },
  { nome: 'Knaus', modelli: ['Boxstar', 'Sky Ti', 'Sky Wave', 'Van Ti'] },
  { nome: 'Laika', modelli: ['Ecovip', 'Kosmo', 'Kreos'] },
  { nome: 'Rimor', modelli: ['Evo', 'Katamarano', 'Seal'] },

  // --- moto e scooter ---
  { nome: 'Aprilia', modelli: ['Dorsoduro', 'RS 660', 'RSV4', 'Scarabeo', 'SR', 'SX', 'Tuareg', 'Tuono'] },
  { nome: 'Benelli', modelli: ['Leoncino', 'TNT', 'TRK 502', 'TRK 702'] },
  { nome: 'Beta', modelli: ['Alp', 'RR', 'Xtrainer'] },
  { nome: 'BMW Motorrad', modelli: ['C 400', 'F 750 GS', 'F 900 R', 'R 1250 GS', 'R nineT', 'S 1000 RR'] },
  { nome: 'Ducati', modelli: ['Diavel', 'Hypermotard', 'Monster', 'Multistrada', 'Panigale', 'Scrambler', 'Streetfighter', 'SuperSport'] },
  { nome: 'Harley-Davidson', modelli: ['Fat Boy', 'Iron 883', 'Pan America', 'Road King', 'Sportster', 'Street Glide'] },
  { nome: 'Honda Moto', modelli: ['Africa Twin', 'CB 500', 'CB 650', 'CBR 600', 'Forza', 'Hornet', 'NC 750', 'SH 125', 'SH 150', 'SH 300', 'Transalp', 'X-ADV'] },
  { nome: 'Husqvarna', modelli: ['Norden', 'Svartpilen', 'TE', 'Vitpilen'] },
  { nome: 'Kawasaki', modelli: ['Ninja', 'Versys', 'Vulcan', 'Z650', 'Z900', 'ZX-10R'] },
  { nome: 'KTM', modelli: ['390 Duke', '790 Adventure', '1290 Super Duke', 'Duke 125', 'EXC', 'RC 390', 'SMC'] },
  { nome: 'Kymco', modelli: ['Agility', 'AK 550', 'Downtown', 'People', 'Xciting'] },
  { nome: 'Moto Guzzi', modelli: ['California', 'Griso', 'Stelvio', 'V7', 'V85 TT', 'V100'] },
  { nome: 'MV Agusta', modelli: ['Brutale', 'Dragster', 'F3', 'F4', 'Turismo Veloce'] },
  { nome: 'Piaggio Moto', modelli: ['Beverly', 'Liberty', 'Medley', 'MP3', 'Zip'] },
  { nome: 'SYM', modelli: ['Cruisym', 'Jet', 'Symphony'] },
  { nome: 'Triumph', modelli: ['Bonneville', 'Rocket 3', 'Scrambler', 'Speed Triple', 'Street Triple', 'Tiger', 'Trident'] },
  { nome: 'Vespa', modelli: ['GTS', 'GTV', 'Primavera', 'PX', 'Sprint'] },
  { nome: 'Yamaha', modelli: ['MT-07', 'MT-09', 'NMAX', 'R1', 'R6', 'Tenere 700', 'TMAX', 'Tracer', 'XMAX', 'XSR'] },

  { nome: 'Altra marca', modelli: [] },
];

const NOMI_MARCHE = MARCHE.map((m) => m.nome);

function normalizza(testo) {
  return String(testo ?? '').trim().toLowerCase();
}

/** Marche che contengono il testo digitato: prima quelle che iniziano così. */
export function cercaMarche(testo) {
  const q = normalizza(testo);
  if (!q) return [...NOMI_MARCHE];
  const inizio = [];
  const dentro = [];
  for (const nome of NOMI_MARCHE) {
    const n = normalizza(nome);
    if (n.startsWith(q)) inizio.push(nome);
    else if (n.includes(q)) dentro.push(nome);
  }
  return [...inizio, ...dentro];
}

export function modelliDi(marca) {
  const q = normalizza(marca);
  return MARCHE.find((m) => normalizza(m.nome) === q)?.modelli ?? [];
}

/** Modelli della marca che contengono il testo digitato. */
export function cercaModelli(marca, testo) {
  const modelli = modelliDi(marca);
  const q = normalizza(testo);
  if (!q) return [...modelli];
  const inizio = [];
  const dentro = [];
  for (const nome of modelli) {
    const n = normalizza(nome);
    if (n.startsWith(q)) inizio.push(nome);
    else if (n.includes(q)) dentro.push(nome);
  }
  return [...inizio, ...dentro];
}
