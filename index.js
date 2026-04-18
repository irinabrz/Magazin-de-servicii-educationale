const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const sass = require('sass');

const app = express();
const PORT = 8080;
var obGlobal = { 
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/css'),
    folderCss: path.join(__dirname, 'resurse/css')
};
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let cale = path.join(__dirname, folder);
    if (!fs.existsSync(cale)) {
        fs.mkdirSync(cale, { recursive: true });
    }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

//functii

function getAnotimp() {
    let luna = new Date().getMonth(); 
    if ([11, 0, 1].includes(luna)) return "iarna";
    if ([2, 3, 4].includes(luna)) return "primavara";
    if ([5, 6, 7].includes(luna)) return "vara";
    return "toamna";
}

function genereazaImaginiMici(galerieData) {
    const caleGalerie = path.join(__dirname, 'resurse', 'galerie'); 
    if (!fs.existsSync(caleGalerie)) return;
    galerieData.imagini.forEach(img => {
        const caleOriginala = path.join(caleGalerie, img.cale_fisier);
        const caleMica = path.join(caleGalerie, 'mic-' + img.cale_fisier);

        if (fs.existsSync(caleOriginala) && !fs.existsSync(caleMica)) {
            sharp(caleOriginala)
                .resize(300)
                .toFile(caleMica)
                .then(() => console.log(" Creată imagine mică:", img.cale_fisier))
                .catch(err => console.error(" Eroare Sharp:", err));
        }
    });
}

function compileazaScss(caleScss, caleCss) {
    let scssAbsolut = path.isAbsolute(caleScss) ? caleScss : path.join(obGlobal.folderScss, caleScss);
    let numeFisierCss = caleCss ? caleCss : path.basename(caleScss, '.scss') + '.css';
    let cssAbsolut = path.isAbsolute(numeFisierCss) ? numeFisierCss : path.join(obGlobal.folderCss, numeFisierCss);

    // 1. BACKUP - Forțăm citirea fișierului existent înainte de orice altceva
    if (fs.existsSync(cssAbsolut)) {
        let folderBackupCss = path.join(__dirname, 'backup/resurse/css');
        if (!fs.existsSync(folderBackupCss)) fs.mkdirSync(folderBackupCss, { recursive: true });
        
        try {
            // Folosim readFileSync + writeFileSync pentru a fi siguri că transferăm tot conținutul
            let continutVechi = fs.readFileSync(cssAbsolut, 'utf8');
            fs.writeFileSync(path.join(folderBackupCss, path.basename(cssAbsolut)), continutVechi);
            console.log(`📂 Backup creat pentru ${path.basename(cssAbsolut)}`);
        } catch (err) {
            console.error("❌ Eroare la backup CSS:", err);
        }
    }

    // 2. COMPILARE
    try {
        const rezultat = sass.compile(scssAbsolut);
        fs.writeFileSync(cssAbsolut, rezultat.css);
        console.log(`🎨 [SCSS] Compilat cu succes: ${path.basename(scssAbsolut)}`);
    } catch (err) {
        console.error("❌ Eroare Compilare SCSS:", err);
    }
}

function initErori() {
    try {
        const caleJson = path.join(__dirname, 'resurse', 'json', 'erori.json');
        if (fs.existsSync(caleJson)) {
            const dateJson = JSON.parse(fs.readFileSync(caleJson, 'utf-8'));
            obGlobal.obErori = dateJson;
            if (obGlobal.obErori.info_erori) {
                obGlobal.obErori.info_erori.forEach(e => {
                    e.imagine = path.join(obGlobal.obErori.cale_baza, e.imagine);
                });
            }
        }
    } catch (err) { console.error("Eroare initErori:", err.message); }
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroareGasita = obGlobal.obErori?.info_erori?.find(e => e.identificator == identificator) || obGlobal.obErori?.eroare_default;
    res.status(identificator || 500).render('pagini/eroare', {
        titlu: titlu || eroareGasita?.titlu,
        text: text || eroareGasita?.text,
        imagine: imagine || eroareGasita?.imagine,
        ip: res.req.ip
    });
}

//rute
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
});

app.get(['/', '/index', '/galerie_pag'], function(req, res) {
    let pagina = req.path === '/galerie_pag' ? 'galerie_pag' : 'index';
    try {
        const dateRaw = fs.readFileSync(__dirname + '/resurse/json/galerie.json', 'utf8');
        const galerieData = JSON.parse(dateRaw);
        genereazaImaginiMici(galerieData);
        const anotimpCurent = getAnotimp();
        let imaginiTrimise = galerieData.imagini.filter(img => img.anotimp === anotimpCurent);
        if (pagina === 'index') imaginiTrimise = imaginiTrimise.slice(0, 10);
        res.render('pagini/' + pagina, { 
            imagini: imaginiTrimise, 
            cale: galerieData.cale_galerie,
            ip: req.ip 
        });
    } catch (err) { afisareEroare(res, 500); }
});

app.get(/^\/(.*)/, (req, res) => {
    let paginaCeruta = req.params[0] || 'index';
    const extensiiStatice = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.css', '.js', '.scss'];
    
    if (extensiiStatice.includes(path.extname(paginaCeruta))) return afisareEroare(res, 404);
    if (req.url.startsWith("/resurse")) return afisareEroare(res, 403);
    if (path.extname(paginaCeruta) === ".ejs") return afisareEroare(res, 400);

    res.render("pagini/" + paginaCeruta, { ip: req.ip }, (eroare, html) => {
        if (eroare) {
            if (eroare.message.includes("Failed to lookup view")) afisareEroare(res, 404);
            else afisareEroare(res, 500);
        } else { res.send(html); }
    });
});

// --- COMPILARE ȘI WATCHER (La final, înainte de listen) ---

if (fs.existsSync(obGlobal.folderScss)) {
    // Inițial
    fs.readdirSync(obGlobal.folderScss).forEach(fisier => {
        if (path.extname(fisier) === '.scss') compileazaScss(fisier);
    });

    // Pe parcurs
    fs.watch(obGlobal.folderScss, (eveniment, numeFisier) => {
        if (numeFisier && path.extname(numeFisier) === '.scss') {
            setTimeout(() => {
                console.log(` Recompilare automată: ${numeFisier}`);
                compileazaScss(numeFisier);
            }, 100);
        }
    });
}

app.listen(PORT, () => console.log(`Server pornit: http://localhost:${PORT}`));