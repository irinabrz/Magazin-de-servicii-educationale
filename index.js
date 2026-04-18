const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// functii

function getAnotimp() {
    let luna = new Date().getMonth(); 
    if ([11, 0, 1].includes(luna)) return "iarna";
    if ([2, 3, 4].includes(luna)) return "primavara";
    if ([5, 6, 7].includes(luna)) return "vara";
    return "toamna";
}

function genereazaImaginiMici(galerieData) {
    const caleGalerie = path.join(__dirname, 'resurse', 'galerie'); 
    
    galerieData.imagini.forEach(img => {
        const caleOriginala = path.join(caleGalerie, img.cale_fisier);
        const caleMica = path.join(caleGalerie, 'mic-' + img.cale_fisier);

        if (fs.existsSync(caleOriginala) && !fs.existsSync(caleMica)) {
            sharp(caleOriginala)
                .resize(300)
                .toFile(caleMica)
                .then(() => console.log("A fost creată imaginea mică:", caleMica))
                .catch(err => console.error("Eroare Sharp:", err));
        }
    });
}
//init
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleCompleta = path.join(__dirname, folder);
    if (!fs.existsSync(caleCompleta)) fs.mkdirSync(caleCompleta, { recursive: true });
}

var obGlobal = { obErori: null };
function initErori() {
    try {
        const caleJson = path.join(__dirname, 'resurse', 'json', 'erori.json');
        const dateJson = JSON.parse(fs.readFileSync(caleJson, 'utf-8'));
        obGlobal.obErori = dateJson;
        if (obGlobal.obErori.info_erori) {
            obGlobal.obErori.info_erori.forEach(e => {
                e.imagine = path.join(obGlobal.obErori.cale_baza, e.imagine);
            });
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

app.get('/galerie_pag', function(req, res) {
    try {
        const dateRaw = fs.readFileSync(__dirname + '/resurse/json/galerie.json', 'utf8');
        const galerieData = JSON.parse(dateRaw);
        
        genereazaImaginiMici(galerieData);

        const anotimpCurent = getAnotimp();
        const imaginiTrimise = galerieData.imagini.filter(img => img.anotimp === anotimpCurent);

        res.render('pagini/galerie_pag', { 
            imagini: imaginiTrimise, 
            cale: galerieData.cale_galerie,
            ip: req.ip 
        });
    } catch (err) { afisareEroare(res, 500); }
});

//ruta idnex
app.get(['/', '/index'], function(req, res) {
    try {
        const dateRaw = fs.readFileSync(__dirname + '/resurse/json/galerie.json', 'utf8');
        const galerieData = JSON.parse(dateRaw);
        
        genereazaImaginiMici(galerieData); 

        const anotimpCurent = getAnotimp();
        const imaginiTrimise = galerieData.imagini
            .filter(img => img.anotimp === anotimpCurent)
            .slice(0, 10);

        res.render('pagini/index', { 
            imagini: imaginiTrimise, 
            cale: galerieData.cale_galerie,
            ip: req.ip
        });
    } catch (err) { afisareEroare(res, 500); }
});

//ruta gen
app.get(/^\/(.*)/, (req, res) => {
    let paginaCeruta = req.params[0] || 'index';

    const extensiiStatice = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.css', '.js'];
    if (extensiiStatice.includes(path.extname(paginaCeruta))) {
        return afisareEroare(res, 404);
    }

    if (req.url.startsWith("/resurse")) return afisareEroare(res, 403);
    if (path.extname(paginaCeruta) === ".ejs") return afisareEroare(res, 400);

    res.render("pagini/" + paginaCeruta, { ip: req.ip }, (eroare, html) => {
        if (eroare) {
            if (eroare.message.includes("Failed to lookup view")) afisareEroare(res, 404);
            else afisareEroare(res, 500);
        } else { res.send(html); }
    });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));