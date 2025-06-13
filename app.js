let panier = JSON.parse(localStorage.getItem("panier")) || [];
let commandes = JSON.parse(localStorage.getItem("commandes")) || [];

async function chargerMenu() {
  try {
    const response = await fetch("menu.json");
    const menu = await response.json();
    afficherMenu(menu);
  } catch (error) {
    afficherToaster("Erreur de chargement du menu", "error");
    console.error("Erreur de chargement du menu :", error);
  }
}

// image fallback si non trouvée
function chargerImageAvecFallback(imgElement, urlPrincipale) {
  imgElement.src = urlPrincipale;
  imgElement.onerror = () => {
    imgElement.onerror = null;
    imgElement.src = "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg";
  };
}

function afficherMenu(menu) {
  const menuContainer = document.getElementById("menu-items");
  menuContainer.innerHTML = "";

  menu.forEach(plat => {
    const platDiv = document.createElement("div");
    platDiv.className = "menu-item";

    const img = document.createElement("img");
    img.alt = plat.name;
    img.width = 150;
    img.height = 100;
    img.style.objectFit = "cover";
    img.style.borderRadius = "6px";

    chargerImageAvecFallback(img, plat.image);

    const name = document.createElement("h3");
    name.textContent = plat.name;

    const price = document.createElement("p");
    price.textContent = `Prix : ${plat.price.toFixed(2)} €`;

    const btn = document.createElement("button");
    btn.textContent = "Ajouter";
    btn.onclick = () => ajouterAuPanier(plat.id);

    platDiv.appendChild(img);
    platDiv.appendChild(name);
    platDiv.appendChild(price);
    platDiv.appendChild(btn);

    menuContainer.appendChild(platDiv);
  });
}

// panier
function ajouterAuPanier(idPlat) {
  const plat = panier.find(p => p.id === idPlat);
  if (plat) {
    plat.quantite++;
  } else {
    panier.push({ id: idPlat, quantite: 1 });
  }
  localStorage.setItem("panier", JSON.stringify(panier));
  mettreAJourPanier();
}

async function mettreAJourPanier() {
  const cartContainer = document.getElementById("cart-items");
  cartContainer.innerHTML = "";

  const response = await fetch("menu.json");
  const menu = await response.json();

  let total = 0;

  panier.forEach(item => {
    const plat = menu.find(p => p.id === item.id);
    const prixTotal = plat.price * item.quantite;
    total += prixTotal;

    const ligne = document.createElement("div");
    ligne.innerHTML = `
      ${plat.name} x ${item.quantite} = ${prixTotal.toFixed(2)} €
      <button onclick="changerQuantite(${item.id}, 1)">+</button>
      <button onclick="changerQuantite(${item.id}, -1)">-</button>
    `;
    cartContainer.appendChild(ligne);
  });

  document.getElementById("cart-total").textContent = `${total.toFixed(2)} €`;
}

document.getElementById("btn-vider-panier").addEventListener("click", () => {
  if (panier.length === 0) {
    afficherToaster("Le panier est déjà vide.");
    return;
  }

  if (confirm("Êtes-vous sûr de vouloir vider le panier ?")) {
    panier = [];
    mettreAJourPanier();
    afficherToaster("Panier vidé.");
  }
});


function changerQuantite(id, delta) {
  const item = panier.find(p => p.id === id);
  if (!item) return;

  item.quantite += delta;
  if (item.quantite <= 0) {
    panier = panier.filter(p => p.id !== id);
  }

  localStorage.setItem("panier", JSON.stringify(panier));
  mettreAJourPanier();
}

function afficherToaster(message, type = "info") {
  const toaster = document.createElement("div");
  toaster.textContent = message;
  toaster.className = `toaster ${type}`;
  document.body.appendChild(toaster);
  setTimeout(() => toaster.remove(), 3000);
}


// recap commande
document.getElementById("btn-commander").addEventListener("click", afficherRecapitulatif);

async function afficherRecapitulatif() {
  const recap = document.getElementById("recapitulatif");
  recap.style.display = "block";
  recap.innerHTML = "<h2>Récapitulatif de commande</h2>";

  const response = await fetch("menu.json");
  const menu = await response.json();

  let totalHT = 0;
  panier.forEach(item => {
    const plat = menu.find(p => p.id === item.id);
    const prix = plat.price * item.quantite;
    totalHT += prix;
    recap.innerHTML += `<p>${plat.name} x ${item.quantite} = ${prix.toFixed(2)} €</p>`;
  });

  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;

  recap.innerHTML += `<p>Sous-total : ${totalHT.toFixed(2)} €</p>`;
  recap.innerHTML += `<p>TVA (20%) : ${tva.toFixed(2)} €</p>`;
  recap.innerHTML += `<p><strong>Total TTC : ${totalTTC.toFixed(2)} €</strong></p>`;

  const validerBtn = document.createElement("button");
  validerBtn.textContent = "Valider";
  validerBtn.onclick = validerCommande;

  const annulerBtn = document.createElement("button");
  annulerBtn.textContent = "Annuler";
  annulerBtn.onclick = () => recap.style.display = "none";

  recap.appendChild(validerBtn);
  recap.appendChild(annulerBtn);
}

// commande
async function validerCommande() {
  if (commandes.length >= 5) {
    afficherToaster("Limite de 5 commandes atteinte !", "error");
    return;
  }

  const recap = document.getElementById("recapitulatif");
  recap.innerHTML = "<p>Envoi de votre commande...</p>";

  try {
    const commandeId = Date.now();
    const nouvelleCommande = { id: commandeId, statut: "Préparation", timer: null };
    commandes.push(nouvelleCommande);
    localStorage.setItem("commandes", JSON.stringify(commandes));
    afficherCommandes();

    await fakePostCommande();
    recap.innerHTML += `<p id=\"commande-${commandeId}\">Préparation... <button onclick=\"annulerCommande(${commandeId})\">Annuler</button></p>`;

    nouvelleCommande.timer = setTimeout(() => {
      recap.innerHTML += "<p>En livraison...</p>";
      nouvelleCommande.timer = setTimeout(() => {
        recap.innerHTML += "<p><strong>Livré ! Bon appétit 🍕</strong></p>";
        commandes = commandes.filter(c => c.id !== commandeId);
        localStorage.setItem("commandes", JSON.stringify(commandes));
        afficherCommandes();
      }, 2000);
    }, 2000);

    panier = [];
    localStorage.removeItem("panier");
    mettreAJourPanier();
  } catch (err) {
    afficherToaster("Erreur lors de l’envoi de la commande 😢", "error");
    console.error(err);
  }
}

function annulerCommande(id) {
  const commande = commandes.find(c => c.id === id);
  if (commande) {
    clearTimeout(commande.timer);
    commandes = commandes.filter(c => c.id !== id);
    localStorage.setItem("commandes", JSON.stringify(commandes));
    afficherCommandes();
    afficherToaster("Commande annulée", "info");
  }
}

function afficherCommandes() {
  const zone = document.getElementById("commandes-en-cours");
  if (!zone) return;
  zone.innerHTML = "<h3>Commandes en cours</h3>";
  commandes.forEach(c => {
    zone.innerHTML += `<p>Commande #${c.id} - ${c.statut}</p>`;
  });
}

function fakePostCommande() {
  return new Promise(resolve => setTimeout(() => resolve("OK"), 1000));
}

// chargement initial
document.addEventListener("DOMContentLoaded", () => {
  chargerMenu();
  mettreAJourPanier();
  afficherCommandes();
});
