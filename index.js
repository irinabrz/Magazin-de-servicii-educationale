const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8080;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleCompleta = path.join(__dirname, folder);
    
    if (!fs.existsSync(caleCompleta)) {
        fs.mkdirSync(caleCompleta, { recursive: true });
        console.log(`Folderul "${folder}" a fost creat.`);
    }
}
console.log("Directorul fișierului (__dirname):", __dirname);
console.log("Calea completă a fișierului (__filename):", __filename);
var obGlobal = {
    obErori: null
};

function initErori() {
    try {
        const caleJson = path.join(__dirname, 'resurse', 'json', 'erori.json');
        const continut = fs.readFileSync(caleJson, 'utf-8');
        let dateJson = JSON.parse(continut);
        
        obGlobal.obErori = dateJson;

        if (obGlobal.obErori.eroare_default) {
            obGlobal.obErori.eroare_default.imagine = path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine);
        }

        if (obGlobal.obErori.info_erori) {
            for (let eroare of obGlobal.obErori.info_erori) {
                eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
            }
        }
        console.log("Erorile au fost inițializate corect.");
    } catch (err) {
        console.error("Eroare la initErori:", err.message);
    }
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroareGasita = obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
    
    if (!eroareGasita) {
        eroareGasita = obGlobal.obErori.eroare_default;
    }

    let titluFinal = titlu || eroareGasita.titlu;
    let textFinal = text || eroareGasita.text;
    let imagineFinal = imagine || eroareGasita.imagine;

    let statusCod = (eroareGasita.status && identificator) ? identificator : 200;

    res.status(statusCod).render('pagini/eroare', {
        titlu: titluFinal,
        text: textFinal,
        imagine: imagineFinal,
        ip: res.req.ip
    });
}

app.get("/favicon.ico", (req, res) => {
    const caleFavicon = path.join(__dirname, "resurse", "imagini", "favicon", "favicon.ico");
    res.sendFile(caleFavicon, (err) => {
        if (err) {
            res.status(404).end();
        }
    });
});

app.get(["/", "/index", "/home"], (req, res) => {
    res.render("pagini/index", { ip: req.ip });
});

app.get(/^\/(.*)/, (req, res) => {
    let paginaCeruta = req.params[0] || 'index';

    if (req.url.startsWith("/resurse") && (req.url.endsWith("/") || !path.extname(req.url))) {
        return afisareEroare(res, 403);
    }

    if (path.extname(paginaCeruta) === ".ejs") {
        return afisareEroare(res, 400);
    }

    res.render("pagini/" + paginaCeruta, { ip: req.ip }, function(eroare, rezultatRandare) {
        if (eroare) {
            if (eroare.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500); 
            }
        } else {
            res.send(rezultatRandare);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Serverul a pornit pe http://localhost:${PORT}`);
});