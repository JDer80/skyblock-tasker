let toutesLesTaches = [];

// Download the tasks.json file on page load
fetch("tasks.json")
    .then(response => response.json())
    .then(data => {
        toutesLesTaches = data;
        console.log("Tasks successfully loaded:", toutesLesTaches);
        
        // Initialization after loading
        mettreAJourStats();
        if (tachesEnCoursIds.length > 0) {
            rendreTachesActives();
        }
        mettreAJourStatsTiers(); 
        verifierVerrouillageOptions();
    })
    .catch(error => console.error("Error loading JSON:", error));

// Store IDs of completed tasks for stats
let tachesCompleteesIds = JSON.parse(localStorage.getItem("tachesCompleteesIds")) || [];
let tachesEnCoursIds = JSON.parse(localStorage.getItem("tachesEnCoursIds")) || [];
let tachesBacklog = JSON.parse(localStorage.getItem("tachesBacklog")) || []; // [{ids, name}]
let extraBacklogSlots = parseInt(localStorage.getItem("extraBacklogSlots")) || 0;

// Element selection
const boutonRoll = document.getElementById("boutonRoll");
const affichage = document.getElementById("affichageTache");
const txtCompteurTaches = document.getElementById("compteurTaches");
const txtCompteurRerolls = document.getElementById("compteurRerolls");
const txtBacklogSlots = document.getElementById("backlogSlots");
const boutonBuySlot = document.getElementById("boutonBuySlot");

// Options selection
const inputReroll = document.getElementById("inputReroll");
const inputNbTaches = document.getElementById("inputNbTaches");
const inputBacklogCost = document.getElementById("inputBacklogCost");
const boutonSauvegarderOptions = document.getElementById("boutonSauvegarderOptions");
const boutonReset = document.getElementById("boutonReset");

// --- 1. DATA LOADING ---
let tacheSauvegardee = localStorage.getItem("tacheEnCours");
let tachesTerminees = parseInt(localStorage.getItem("tachesTerminees")) || 0;
let rerollsGratuits = parseInt(localStorage.getItem("rerollsGratuits")) || 0;
let nbTachesActives = parseInt(localStorage.getItem("nbTachesActives")) || 1; // Current number of tasks to do

// Load custom options
let tachesPourReroll = parseInt(localStorage.getItem("tachesPourReroll")) || 20;
let tachesTireesSimultanees = parseInt(localStorage.getItem("tachesTireesSimultanees")) || 2;
let costBacklogSlot = parseInt(localStorage.getItem("costBacklogSlot")) || 15;

inputReroll.value = tachesPourReroll;
inputNbTaches.value = tachesTireesSimultanees;
inputBacklogCost.value = costBacklogSlot;

// Interface update function
function mettreAJourStats() {
    txtCompteurTaches.innerText = tachesTerminees;
    txtCompteurRerolls.innerText = rerollsGratuits;

    // Calculate backlog slots
    updateBacklogUI();
    
    // Update shop button text
    boutonBuySlot.innerText = `🛒 +1 Backlog Slot (${costBacklogSlot} Rerolls)`;
}

function verifierVerrouillageOptions() {
    if (tachesTerminees > 0) {
        inputReroll.disabled = true;
        inputNbTaches.disabled = true;
        inputBacklogCost.disabled = true;
        boutonSauvegarderOptions.disabled = true;
        boutonSauvegarderOptions.innerText = "🔒 Options locked (Run started)";
        boutonSauvegarderOptions.style.opacity = "0.5";
        boutonSauvegarderOptions.style.cursor = "not-allowed";
    }
}

// Stats tab update function
function mettreAJourStatsTiers() {
    const statsContent = document.getElementById("stats-content");
    if (!statsContent || toutesLesTaches.length === 0) return;

    // Group tasks by tier
    const tiers = {};
    toutesLesTaches.forEach(tache => {
        if (!tiers[tache.tier]) {
            tiers[tache.tier] = { total: 0, completed: 0 };
        }
        tiers[tache.tier].total++;
        if (tachesCompleteesIds.includes(tache.id)) {
            tiers[tache.tier].completed++;
        }
    });

    // Generate HTML
    let html = "";
    Object.keys(tiers).sort().forEach(tier => {
        const { total, completed } = tiers[tier];
        const pourcentage = Math.round((completed / total) * 100);
        html += `
            <div class="stat-tier">
                <span>Tier ${tier}</span>
                <span>${completed} / ${total} (${pourcentage}%)</span>
            </div>
        `;
    });

    statsContent.innerHTML = html;
    
    // Get number of completed tiers for backlog
    let tiersTermines = 0;
    Object.keys(tiers).forEach(tier => {
        if (tiers[tier].completed === tiers[tier].total) {
            tiersTermines++;
        }
    });

    localStorage.setItem("tiersTermines", tiersTermines);
    updateBacklogUI();
}

// Utility function to get stats without touching DOM
function calculerStatsTiers() {
    const stats = {};
    toutesLesTaches.forEach(tache => {
        if (!stats[tache.tier]) {
            stats[tache.tier] = { total: 0, completed: 0 };
        }
        stats[tache.tier].total++;
        if (tachesCompleteesIds.includes(tache.id)) {
            stats[tache.tier].completed++;
        }
    });
    return stats;
}

function updateBacklogUI() {
    const tiersTermines = parseInt(localStorage.getItem("tiersTermines")) || 0;
    const totalSlots = tiersTermines + extraBacklogSlots;
    txtBacklogSlots.innerText = `${tachesBacklog.length}/${totalSlots}`;

    const backlogSection = document.getElementById("backlog-section");
    const backlogContent = document.getElementById("backlog-content");

    if (tachesBacklog.length > 0) {
        backlogSection.classList.remove("cacher");
        let html = "";
        tachesBacklog.forEach((item, index) => {
            html += `
                <div class="backlog-item">
                    <span>${item.name}</span>
                    <div class="active-task-actions">
                        <button class="btn-done" onclick="terminerTacheBacklog(${index})">✅</button>
                        <button onclick="reprendreDepuisBacklog(${index})">📂</button>
                    </div>
                </div>
            `;
        });
        backlogContent.innerHTML = html;
    } else {
        backlogSection.classList.add("cacher");
    }
}

function rendreTachesActives() {
    if (tachesEnCoursIds.length === 0) {
        affichage.innerHTML = "Click the button to roll new tasks!";
        boutonRoll.classList.remove("cacher");
        return;
    }

    boutonRoll.classList.add("cacher");
    let html = "<h3>🎯 Current Tasks:</h3>";
    tachesEnCoursIds.forEach((id, index) => {
        const tache = toutesLesTaches.find(t => t.id === id);
        if (!tache) return;
        html += `
            <div class="active-task-item">
                <span>🔸 ${tache.name}</span>
                <div class="active-task-actions">
                    <button class="btn-done" onclick="terminerTacheSpecifique(${index})">✅</button>
                    <button class="btn-backlog" onclick="backlogTacheSpecifique(${index})">📦</button>
                </div>
            </div>
        `;
    });
    affichage.innerHTML = html;
}

// --- 2. OPTIONS & RESET BUTTONS ---
boutonSauvegarderOptions.addEventListener("click", () => {
    let nvReroll = parseInt(inputReroll.value);
    let nvNb = parseInt(inputNbTaches.value);
    let nvCost = parseInt(inputBacklogCost.value);

    if (nvReroll > 0 && nvNb > 0 && nvCost >= 0) {
        tachesPourReroll = nvReroll;
        tachesTireesSimultanees = nvNb;
        costBacklogSlot = nvCost;
        localStorage.setItem("tachesPourReroll", tachesPourReroll);
        localStorage.setItem("tachesTireesSimultanees", tachesTireesSimultanees);
        localStorage.setItem("costBacklogSlot", costBacklogSlot);

        boutonSauvegarderOptions.innerText = "✔️ Options Saved!";
        setTimeout(() => { boutonSauvegarderOptions.innerText = "Save options"; }, 1500);
        mettreAJourStats();
    }
});

boutonReset.addEventListener("click", () => {
    if (boutonReset.innerText === "⚠️ Confirm reset?") {
        localStorage.clear();
        location.reload();
    } else {
        boutonReset.innerText = "⚠️ Confirm reset?";
        setTimeout(() => {
            boutonReset.innerText = "⚠️ Reset all progress";
        }, 3000);
    }
});

// --- 3. ROLLING TASKS ---
function tirerNouvelleTache() {
    affichage.innerText = "Searching...";
    boutonRoll.classList.add("cacher");

    setTimeout(() => {
        // 1. Determine current Tier (lowest incomplete)
        const stats = calculerStatsTiers();
        const tiersNonFinis = Object.keys(stats).filter(t => stats[t].completed < stats[t].total).sort();
        
        const tierActuel = tiersNonFinis.length > 0 ? tiersNonFinis[0] : null;

        if (!tierActuel) {
            affichage.innerHTML = "🏆 Well done! You have completed ALL tasks from all tiers!";
            boutonRoll.classList.remove("cacher");
            return;
        }

        // 2. Filter incomplete tasks from current tier only
        let pool = toutesLesTaches.filter(t => t.tier == tierActuel && !tachesCompleteesIds.includes(t.id));
        
        if (pool.length === 0) pool = toutesLesTaches.filter(t => !tachesCompleteesIds.includes(t.id));

        let listeIds = [];
        let nbATirer = Math.min(tachesTireesSimultanees, pool.length);

        for (let i = 0; i < nbATirer; i++) {
            let indexAleatoire = Math.floor(Math.random() * pool.length);
            let tache = pool[indexAleatoire];
            listeIds.push(tache.id);
            pool.splice(indexAleatoire, 1);
        }

        tachesEnCoursIds = listeIds;
        nbTachesActives = nbATirer;

        localStorage.setItem("tachesEnCoursIds", JSON.stringify(tachesEnCoursIds));
        localStorage.setItem("nbTachesActives", nbTachesActives);

        rendreTachesActives();
        mettreAJourStats();
    }, 500);
}

// --- 5. TASK MANAGEMENT ---
window.terminerTacheSpecifique = function(index) {
    const id = tachesEnCoursIds[index];
    if (!tachesCompleteesIds.includes(id)) {
        tachesCompleteesIds.push(id);
    }
    localStorage.setItem("tachesCompleteesIds", JSON.stringify(tachesCompleteesIds));

    // Calculate rerolls
    let anciensPaliers = Math.floor(tachesTerminees / tachesPourReroll);
    tachesTerminees++;
    let nouveauxPaliers = Math.floor(tachesTerminees / tachesPourReroll);
    rerollsGratuits += (nouveauxPaliers - anciensPaliers);

    tachesEnCoursIds.splice(index, 1);
    sauvegarderEtatEtRafraichir();

    if (nouveauxPaliers > anciensPaliers) {
        affichage.innerHTML = "Well done! 🎉 +1 Reroll earned!";
        setTimeout(() => rendreTachesActives(), 2000);
    }
}

window.backlogTacheSpecifique = function(index) {
    const tiersTermines = parseInt(localStorage.getItem("tiersTermines")) || 0;
    const totalSlots = tiersTermines + extraBacklogSlots;

    if (tachesBacklog.length >= totalSlots) {
        affichage.innerHTML = "😞 No more room in the backlog!";
        setTimeout(() => rendreTachesActives(), 1500);
        return;
    }

    const id = tachesEnCoursIds[index];
    const tache = toutesLesTaches.find(t => t.id === id);

    tachesBacklog.push({
        ids: [id],
        name: "🔸 " + tache.name
    });

    tachesEnCoursIds.splice(index, 1);
    localStorage.setItem("tachesBacklog", JSON.stringify(tachesBacklog));
    sauvegarderEtatEtRafraichir();
}

window.terminerTacheBacklog = function(index) {
    const item = tachesBacklog[index];
    item.ids.forEach(id => {
        if (!tachesCompleteesIds.includes(id)) {
            tachesCompleteesIds.push(id);
        }
    });
    localStorage.setItem("tachesCompleteesIds", JSON.stringify(tachesCompleteesIds));

    // Calculate rerolls
    let anciensPaliers = Math.floor(tachesTerminees / tachesPourReroll);
    tachesTerminees += item.ids.length;
    let nouveauxPaliers = Math.floor(tachesTerminees / tachesPourReroll);
    rerollsGratuits += (nouveauxPaliers - anciensPaliers);

    tachesBacklog.splice(index, 1);
    localStorage.setItem("tachesBacklog", JSON.stringify(tachesBacklog));

    sauvegarderEtatEtRafraichir();

    if (nouveauxPaliers > anciensPaliers) {
        affichage.innerHTML = "Well done! 🎉 +1 Reroll earned!";
        setTimeout(() => updateBacklogUI(), 2000);
    }
}

function sauvegarderEtatEtRafraichir() {
    localStorage.setItem("tachesEnCoursIds", JSON.stringify(tachesEnCoursIds));
    localStorage.setItem("tachesTerminees", tachesTerminees);
    localStorage.setItem("rerollsGratuits", rerollsGratuits);
    
    rendreTachesActives();
    mettreAJourStats();
    mettreAJourStatsTiers();
    verifierVerrouillageOptions();
}

boutonRoll.addEventListener("click", tirerNouvelleTache);

// --- 6. BACKLOG MANAGEMENT (RESUME) ---
window.reprendreDepuisBacklog = function(index) {
    const item = tachesBacklog[index];
    
    item.ids.forEach(id => {
        if (!tachesEnCoursIds.includes(id)) {
            tachesEnCoursIds.push(id);
        }
    });

    tachesBacklog.splice(index, 1);
    localStorage.setItem("tachesBacklog", JSON.stringify(tachesBacklog));

    sauvegarderEtatEtRafraichir();
}

boutonBuySlot.addEventListener("click", () => {
    if (rerollsGratuits >= costBacklogSlot) {
        rerollsGratuits -= costBacklogSlot;
        extraBacklogSlots++;
        localStorage.setItem("rerollsGratuits", rerollsGratuits);
        localStorage.setItem("extraBacklogSlots", extraBacklogSlots);
        mettreAJourStats();
        
        boutonBuySlot.innerText = "✅ Slot purchased!";
        setTimeout(() => mettreAJourStats(), 1500);
    } else {
        boutonBuySlot.innerText = "❌ Not enough Rerolls";
        setTimeout(() => mettreAJourStats(), 1500);
    }
});