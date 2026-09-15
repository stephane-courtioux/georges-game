"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import HomeLink from "../HomeLink";
import styles from "./Gommettes.module.css";

// --- Réglages faciles à changer ---
const PARENT_CODE = "1234"; // le code secret des parents
const OBJECTIF_DEFAUT = 10; // nombre de gommettes vertes à atteindre dans la semaine
const MAX_ROUGES_DEFAUT = 3; // au-delà, la récompense est bloquée
const RECOMPENSE_DEFAUT = "une sortie au parc"; // la récompense proposée au départ
const RAISONS_VERTES = [
  "a rangé sa chambre",
  "a été gentil",
  "a aidé",
  "a bien mangé",
  "s'est brossé les dents sans râler",
  "a fait ses devoirs",
  "s'est habillé tout seul et n'a pas fait la comédie pour partir à l'école",
];
const RAISONS_ROUGES = [
  "a dit un gros mot",
  "n'a pas écouté",
  "a tapé ou poussé",
  "a fait une grosse colère",
  "s'est disputé avec ses frères et sœurs",
];
const PARENT_DUREE_MS = 90_000; // le mode parent se referme tout seul après 1 min 30 sans action
const APPUI_LONG_MS = 1500; // maintenir le repère « parent » aussi longtemps ouvre le pavé du code
const TRIPLE_CLIC_MS = 600; // ... ou 3 clics/taps rapprochés (au plus 600 ms entre deux)
const RAFRAICHISSEMENT_MS = 10_000; // on redemande les données à la base toutes les 10 s
const CLE_BILAN_VU = "hector-gommettes-bilan-vu"; // (sur cet appareil) le dernier bilan déjà affiché
// L'année scolaire affichée dans l'historique : du lundi de la rentrée (le 1er septembre 2026
// est un mardi) au lundi de la dernière semaine (les vacances 2027 commencent le 6 juillet).
const PREMIER_LUNDI_ANNEE = "2026-08-31";
const DERNIER_LUNDI_ANNEE = "2027-07-05";

// --- Dates ---

// Le lundi de la semaine qui contient cette date, sous la forme "AAAA-MM-JJ" (heure locale).
function lundiDeLaSemaine(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const decalage = (d.getDay() + 6) % 7; // lundi = 0 ... dimanche = 6
  d.setDate(d.getDate() - decalage);
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

// "2026-09-07" → Date locale
function dateLocale(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}

// "2026-09-07" → "lundi 7 septembre"
function formaterDate(iso) {
  return dateLocale(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// Le lundi d'il y a 7 jours.
function lundiPrecedent(lundi) {
  const d = dateLocale(lundi);
  d.setDate(d.getDate() - 7);
  return lundiDeLaSemaine(d);
}

// Tous les lundis de l'année scolaire, dans l'ordre : ["2026-08-31", "2026-09-07", ...]
function lundisDeLAnnee() {
  const lundis = [];
  const d = dateLocale(PREMIER_LUNDI_ANNEE);
  while (lundiDeLaSemaine(d) <= DERNIER_LUNDI_ANNEE) {
    lundis.push(lundiDeLaSemaine(d));
    d.setDate(d.getDate() + 7);
  }
  return lundis;
}

// --- Base de données (Supabase) ---
// Table gommettes        : id, type ('verte' | 'rouge'), raison, debut_semaine (date), created_at
// Table reglages_semaine : debut_semaine (clé), objectif, max_rouges, recompense

// Les réglages par défaut quand aucune ligne n'existe pour la semaine.
function reglagesParDefaut() {
  return { objectif: OBJECTIF_DEFAUT, maxRouges: MAX_ROUGES_DEFAUT, recompense: RECOMPENSE_DEFAUT };
}

// Ligne de la base → objet utilisé par l'écran.
function reglagesDepuisLigne(ligne) {
  if (!ligne) return reglagesParDefaut();
  return {
    objectif: ligne.objectif ?? OBJECTIF_DEFAUT,
    maxRouges: ligne.max_rouges ?? MAX_ROUGES_DEFAUT,
    recompense: ligne.recompense ?? RECOMPENSE_DEFAUT,
  };
}

// Si Supabase renvoie une erreur, on la transforme en vraie erreur JavaScript.
function verifier({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// Charge la semaine en cours et la précédente (pour le bilan), en deux requêtes.
async function chargerSemaines() {
  const lundi = lundiDeLaSemaine();
  const avant = lundiPrecedent(lundi);
  const [gommettes, reglages] = await Promise.all([
    supabase
      .from("gommettes")
      .select("id, type, raison, debut_semaine, created_at")
      .in("debut_semaine", [lundi, avant])
      .order("created_at", { ascending: true })
      .then(verifier),
    supabase.from("reglages_semaine").select("*").in("debut_semaine", [lundi, avant]).then(verifier),
  ]);
  const semaine = (l) => ({
    lundi: l,
    gommettes: gommettes.filter((g) => g.debut_semaine === l),
    reglages: reglagesDepuisLigne(reglages.find((r) => r.debut_semaine === l)),
  });
  return { courante: semaine(lundi), precedente: semaine(avant) };
}

// Charge toute l'année (pour l'historique) : juste le type et la semaine de chaque gommette.
async function chargerAnnee() {
  const [gommettes, reglages] = await Promise.all([
    supabase
      .from("gommettes")
      .select("type, debut_semaine")
      .gte("debut_semaine", PREMIER_LUNDI_ANNEE)
      .lte("debut_semaine", DERNIER_LUNDI_ANNEE)
      .then(verifier),
    supabase
      .from("reglages_semaine")
      .select("*")
      .gte("debut_semaine", PREMIER_LUNDI_ANNEE)
      .lte("debut_semaine", DERNIER_LUNDI_ANNEE)
      .then(verifier),
  ]);
  return { gommettes, reglages };
}

async function insererGommette(type, raison, lundi) {
  verifier(await supabase.from("gommettes").insert({ type, raison, debut_semaine: lundi }));
}

// Supprime la gommette la plus récente de la semaine.
async function supprimerDerniereGommette(lundi) {
  const derniere = verifier(
    await supabase
      .from("gommettes")
      .select("id")
      .eq("debut_semaine", lundi)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );
  if (derniere) verifier(await supabase.from("gommettes").delete().eq("id", derniere.id));
}

async function supprimerGommettesDeLaSemaine(lundi) {
  verifier(await supabase.from("gommettes").delete().eq("debut_semaine", lundi));
}

// Écrit (ou met à jour) les réglages de la semaine.
async function enregistrerReglages(lundi, reglages) {
  verifier(
    await supabase.from("reglages_semaine").upsert(
      {
        debut_semaine: lundi,
        objectif: reglages.objectif,
        max_rouges: reglages.maxRouges,
        recompense: reglages.recompense,
      },
      { onConflict: "debut_semaine" }
    )
  );
}

// L'heure actuelle en millisecondes (pour l'auto-fermeture du mode parent).
function maintenant() {
  return Date.now();
}

// --- Calculs ---

// Les totaux d'une semaine et la règle de récompense (modèle doux) :
// la barre ne monte qu'avec les vertes ; trop de rouges bloque la récompense.
function compter(gommettes, reglages) {
  const vertes = gommettes.filter((g) => g.type === "verte").length;
  const rouges = gommettes.filter((g) => g.type === "rouge").length;
  const objectifAtteint = vertes >= reglages.objectif;
  const tropDeRouges = rouges > reglages.maxRouges;
  return { vertes, rouges, objectifAtteint, tropDeRouges, recompenseGagnee: objectifAtteint && !tropDeRouges };
}

// Pour l'écran Historique : chaque semaine de l'année avec ce qu'on en sait.
// statut : "jouee" (il y a des gommettes), "enCours", "aVenir" ou "sansDonnees".
function semainesDeLAnnee(annee, lundiEnCours) {
  const aujourdHui = lundiDeLaSemaine();
  return lundisDeLAnnee().map((lundi) => {
    const gommettes = annee.gommettes.filter((g) => g.debut_semaine === lundi);
    const reglages = reglagesDepuisLigne(annee.reglages.find((r) => r.debut_semaine === lundi));
    const bilan = compter(gommettes, reglages);
    if (lundi === lundiEnCours) return { lundi, statut: "enCours", bilan, reglages };
    if (gommettes.length > 0) return { lundi, statut: "jouee", bilan, reglages };
    if (lundi > aujourdHui) return { lundi, statut: "aVenir" };
    return { lundi, statut: "sansDonnees" };
  });
}

// Le récapitulatif de l'année : semaines réussies et total de vertes (semaine en cours comprise).
function recapDeLAnnee(semaines) {
  const avecBilan = semaines.filter((s) => s.bilan);
  return {
    objectifsAtteints: avecBilan.filter((s) => s.bilan.objectifAtteint).length,
    totalVertes: avecBilan.reduce((total, s) => total + s.bilan.vertes, 0),
  };
}

export default function Gommettes() {
  // Les données venues de la base : null tant qu'on charge. { courante, precedente }
  const [donnees, setDonnees] = useState(null);
  // Un message si la base ne répond pas (on garde quand même les dernières données affichées).
  const [erreur, setErreur] = useState(null);
  // Vrai pendant qu'on écrit dans la base (évite les doubles taps).
  const [occupe, setOccupe] = useState(false);
  // La vue affichée : "tableau", "bilan" (semaine précédente) ou "historique".
  const [vue, setVue] = useState("tableau");
  // Les données de l'année pour l'historique (chargées quand on ouvre cet écran).
  const [annee, setAnnee] = useState(null);

  // Le mode : "hector" (libre), "code" (pavé du code parent) ou "parent" (boutons parent).
  const [mode, setMode] = useState("hector");
  const [code, setCode] = useState(""); // les chiffres tapés sur le pavé
  const [codeFaux, setCodeFaux] = useState(false);
  const [choixRaison, setChoixRaison] = useState(null); // null, "verte" ou "rouge" : on choisit la raison
  const [confirmerReset, setConfirmerReset] = useState(false);
  const [derniereAction, setDerniereAction] = useState(0); // pour l'auto-fermeture du mode parent
  const appuiLongRef = useRef(null); // le minuteur du clic maintenu sur le repère « parent »
  const clicsRef = useRef({ nombre: 0, dernier: 0 }); // pour compter les clics rapprochés

  // --- Chargement initial : la semaine, et le bilan de la précédente si on ne l'a pas encore vu ---
  useEffect(() => {
    let actif = true;
    chargerSemaines()
      .then((d) => {
        if (!actif) return;
        setDonnees(d);
        setErreur(null);
        const { precedente } = d;
        const bilanDejaVu = localStorage.getItem(CLE_BILAN_VU) === precedente.lundi;
        if (precedente.gommettes.length > 0 && !bilanDejaVu) setVue("bilan");
      })
      .catch((e) => actif && setErreur(e.message));
    return () => {
      actif = false;
    };
  }, []);

  // --- Synchro entre appareils : on recharge quand la fenêtre revient, et toutes les 10 s ---
  useEffect(() => {
    let actif = true;
    function rafraichir() {
      if (document.visibilityState !== "visible") return;
      chargerSemaines()
        .then((d) => {
          if (!actif) return;
          setDonnees(d);
          setErreur(null);
        })
        .catch((e) => actif && setErreur(e.message));
    }
    const intervalle = setInterval(rafraichir, RAFRAICHISSEMENT_MS);
    window.addEventListener("focus", rafraichir);
    document.addEventListener("visibilitychange", rafraichir);
    return () => {
      actif = false;
      clearInterval(intervalle);
      window.removeEventListener("focus", rafraichir);
      document.removeEventListener("visibilitychange", rafraichir);
    };
  }, []);

  // --- L'historique : on charge l'année quand on ouvre cet écran ---
  useEffect(() => {
    if (vue !== "historique") return;
    let actif = true;
    chargerAnnee()
      .then((a) => actif && setAnnee(a))
      .catch((e) => actif && setErreur(e.message));
    return () => {
      actif = false;
    };
  }, [vue]);

  // Dans l'historique, on fait défiler la liste jusqu'à la semaine en cours.
  const ligneEnCoursRef = useRef(null);
  useEffect(() => {
    if (vue === "historique" && annee) ligneEnCoursRef.current?.scrollIntoView({ block: "center" });
  }, [vue, annee]);

  // Le mode parent se referme tout seul après un moment sans action.
  useEffect(() => {
    if (mode !== "parent") return;
    const id = setTimeout(() => setMode("hector"), PARENT_DUREE_MS);
    return () => clearTimeout(id);
  }, [mode, derniereAction]);

  // Chaque action parent repousse la fermeture automatique.
  function toucherParent() {
    setDerniereAction(maintenant());
  }

  // Exécute une écriture dans la base puis recharge la semaine. Les erreurs vont dans le bandeau.
  async function modifier(action) {
    setOccupe(true);
    try {
      await action();
      setDonnees(await chargerSemaines());
      setErreur(null);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setOccupe(false);
    }
    toucherParent();
  }

  // --- Ouvrir le mode parent : le repère « 🔒 parent » en bas de page, maintenu 1,5 s
  // ou cliqué 3 fois de suite. Les événements "pointer" marchent pareil au doigt et à la souris.
  function ouvrirPave() {
    clearTimeout(appuiLongRef.current);
    clicsRef.current = { nombre: 0, dernier: 0 };
    setMode("code");
  }
  function debutAppuiRepere(event) {
    event.preventDefault(); // pas de sélection de texte ni de menu iPhone pendant le maintien
    clearTimeout(appuiLongRef.current);
    appuiLongRef.current = setTimeout(ouvrirPave, APPUI_LONG_MS);
    const t = event.timeStamp;
    const clics = clicsRef.current;
    clics.nombre = t - clics.dernier < TRIPLE_CLIC_MS ? clics.nombre + 1 : 1;
    clics.dernier = t;
    if (clics.nombre >= 3) ouvrirPave();
  }
  function finAppuiRepere() {
    clearTimeout(appuiLongRef.current); // relâché trop tôt : on annule le maintien
  }

  // --- Le pavé du code ---
  function taperChiffre(chiffre) {
    const nouveau = code + chiffre;
    setCodeFaux(false);
    if (nouveau.length < PARENT_CODE.length) {
      setCode(nouveau);
      return;
    }
    setCode("");
    if (nouveau === PARENT_CODE) {
      setMode("parent");
      toucherParent();
    } else {
      setCodeFaux(true);
    }
  }

  function fermerParent() {
    setMode("hector");
    setChoixRaison(null);
    setConfirmerReset(false);
  }

  // --- Le bilan est vu : on repart sur le tableau (et on s'en souvient sur cet appareil) ---
  function commencerNouvelleSemaine() {
    localStorage.setItem(CLE_BILAN_VU, donnees.precedente.lundi);
    setVue("tableau");
  }

  // ===== Chargement / erreur au tout début =====
  if (!donnees) {
    return (
      <main className={styles.page}>
        <HomeLink />
        <section className={styles.carte}>
          {erreur ? (
            <>
              <p className={styles.alerte}>Impossible de joindre la base : {erreur}</p>
              <button type="button" className={styles.bouton} onClick={() => location.reload()}>
                Réessayer
              </button>
            </>
          ) : (
            <p className={styles.doux}>Chargement…</p>
          )}
        </section>
      </main>
    );
  }

  const { courante, precedente } = donnees;
  const { lundi, gommettes, reglages } = courante;
  const bilan = compter(gommettes, reglages);
  const vertes = gommettes.filter((g) => g.type === "verte");
  const rouges = gommettes.filter((g) => g.type === "rouge");
  const derniere = gommettes[gommettes.length - 1];
  const progression = Math.min(100, (bilan.vertes / reglages.objectif) * 100);

  // Le petit bandeau d'erreur, affiché sans cacher le tableau.
  const bandeauErreur = erreur && <p className={styles.bandeauErreur}>⚠️ La base ne répond pas : {erreur}</p>;

  // ===== Écran « Bilan de la semaine » (la semaine précédente) =====
  if (vue === "bilan") {
    const b = compter(precedente.gommettes, precedente.reglages);
    return (
      <main className={styles.page}>
        <HomeLink />
        <section className={`${styles.carte} ${styles.bilan}`}>
          {b.recompenseGagnee && <Confettis />}
          <h1 className={styles.titre}>🏁 Bilan de la semaine</h1>
          <p className={styles.sousTitre}>Semaine du {formaterDate(precedente.lundi)}</p>
          <div className={styles.totaux}>
            <span className={styles.totalVert}>🟢 {b.vertes} vertes</span>
            <span className={styles.totalRouge}>🔴 {b.rouges} rouges</span>
          </div>
          <p className={styles.grand}>
            {b.objectifAtteint
              ? `✅ Objectif atteint : ${b.vertes} / ${precedente.reglages.objectif} !`
              : `Objectif pas atteint cette fois : ${b.vertes} / ${precedente.reglages.objectif}.`}
          </p>
          {b.recompenseGagnee && (
            <p className={styles.recompenseGagnee}>
              🎁 Bravo Georges, tu as gagné : <strong>{precedente.reglages.recompense}</strong> !
            </p>
          )}
          {b.objectifAtteint && b.tropDeRouges && (
            <p className={styles.alerte}>Trop de rouges cette semaine : la récompense attendra la prochaine fois.</p>
          )}
          {!b.objectifAtteint && <p className={styles.doux}>Ce n&apos;est pas grave, on recommence lundi ! 💪</p>}
          <button type="button" className={`${styles.bouton} ${styles.boutonPrincipal}`} onClick={commencerNouvelleSemaine}>
            🎉 Commencer une nouvelle semaine
          </button>
        </section>
      </main>
    );
  }

  // ===== Écran « Historique » =====
  if (vue === "historique") {
    const semaines = annee ? semainesDeLAnnee(annee, lundi) : null;
    const recap = semaines ? recapDeLAnnee(semaines) : null;
    return (
      <main className={styles.page}>
        <HomeLink />
        <section className={styles.carte}>
          <h1 className={styles.titre}>📜 Mon année</h1>
          <p className={styles.sousTitre}>
            Du {formaterDate(PREMIER_LUNDI_ANNEE)} 2026 au {formaterDate(DERNIER_LUNDI_ANNEE)} 2027
          </p>
          {bandeauErreur}

          {!semaines ? (
            <p className={styles.doux}>Chargement…</p>
          ) : (
            <>
              {/* Le récapitulatif de l'année */}
              <div className={styles.recap}>
                <span className={styles.recapChiffre}>
                  <strong>{recap.objectifsAtteints}</strong> objectif{recap.objectifsAtteints > 1 ? "s" : ""} atteint
                  {recap.objectifsAtteints > 1 ? "s" : ""}
                </span>
                <span className={styles.recapChiffre}>
                  <strong>🟢 {recap.totalVertes}</strong> vertes depuis la rentrée
                </span>
              </div>

              <ul className={styles.listeHistorique}>
                {semaines.map((s) => (
                  <li
                    key={s.lundi}
                    ref={s.statut === "enCours" ? ligneEnCoursRef : null}
                    className={`${styles.ligneHistorique} ${styles[s.statut]}`}
                  >
                    <span className={styles.ligneDate}>Semaine du {formaterDate(s.lundi)}</span>
                    {s.statut === "jouee" && (
                      <>
                        <span>
                          🟢 {s.bilan.vertes} · 🔴 {s.bilan.rouges}
                        </span>
                        <span className={s.bilan.recompenseGagnee ? styles.gagne : styles.perdu}>
                          {s.bilan.recompenseGagnee
                            ? `🎁 ${s.reglages.recompense}`
                            : s.bilan.objectifAtteint
                              ? "🚫 trop de rouges"
                              : "❌ pas atteint"}
                        </span>
                      </>
                    )}
                    {s.statut === "enCours" && (
                      <>
                        <span>
                          🟢 {s.bilan.vertes} · 🔴 {s.bilan.rouges}
                        </span>
                        <span className={styles.badgeEnCours}>
                          ▶ en cours · {s.bilan.vertes} / {s.reglages.objectif}
                        </span>
                      </>
                    )}
                    {s.statut === "aVenir" && <span className={styles.perdu}>à venir</span>}
                    {s.statut === "sansDonnees" && <span className={styles.perdu}>pas de données</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" className={styles.bouton} onClick={() => setVue("tableau")}>
            ← Retour au tableau
          </button>
        </section>
      </main>
    );
  }

  // ===== Le tableau de la semaine =====
  return (
    <main className={styles.page}>
      <HomeLink />

      <header className={styles.entete}>
        <h1 className={styles.titre}>⭐ Les gommettes de Georges</h1>
        <p className={styles.sousTitre}>Semaine du {formaterDate(lundi)}</p>
        <button type="button" className={styles.boutonDiscret} onClick={() => setVue("historique")}>
          📜 Historique
        </button>
      </header>

      {bandeauErreur}

      {/* La collection de gommettes vertes */}
      <section className={styles.carte}>
        <h2 className={styles.sousTitreCarte}>Ma collection</h2>
        {vertes.length === 0 ? (
          <p className={styles.doux}>Pas encore de gommette… c&apos;est parti ! 💪</p>
        ) : (
          <div className={styles.collection}>
            {vertes.map((g) => (
              <span key={g.id} className={styles.gommetteVerte} title={g.raison}>
                😊
              </span>
            ))}
          </div>
        )}
      </section>

      {/* L'objectif */}
      <section className={styles.carte}>
        <div className={styles.barre}>
          <div className={styles.barreRemplie} style={{ width: `${progression}%` }} />
        </div>
        <p className={styles.grand}>
          {bilan.vertes} / {reglages.objectif}
        </p>
        <p>
          Si tu atteins ton objectif : <strong>{reglages.recompense}</strong>
        </p>
        {bilan.recompenseGagnee && <p className={styles.recompenseGagnee}>🎉 Objectif atteint ! Bravo Georges !</p>}
        {bilan.objectifAtteint && bilan.tropDeRouges && (
          <p className={styles.alerte}>Objectif atteint, mais trop de rouges cette semaine…</p>
        )}
      </section>

      {/* Les rouges */}
      <section className={styles.carte}>
        <p className={styles.grand}>
          🔴 × {bilan.rouges} <span className={styles.petit}>(pas plus de {reglages.maxRouges})</span>
        </p>
        {rouges.length > 0 && (
          <div className={styles.collection}>
            {rouges.map((g) => (
              <span key={g.id} className={styles.gommetteRouge} title={g.raison}>
                😕
              </span>
            ))}
          </div>
        )}
        {bilan.tropDeRouges && <p className={styles.alerte}>Trop de rouges cette semaine</p>}
      </section>

      {/* Le repère discret pour les parents, en bas de page : maintenir 1,5 s ou cliquer 3 fois */}
      {mode === "hector" && (
        <button
          type="button"
          className={styles.repereParent}
          onPointerDown={debutAppuiRepere}
          onPointerUp={finAppuiRepere}
          onPointerLeave={finAppuiRepere}
          onPointerCancel={finAppuiRepere}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Mode parent : maintenir ou cliquer trois fois"
        >
          🔒 parent
        </button>
      )}

      {/* Le pavé du code parent */}
      {mode === "code" && (
        <section className={`${styles.carte} ${styles.pave}`}>
          <p className={styles.sousTitreCarte}>Code parent</p>
          <p className={styles.points}>
            {PARENT_CODE.split("").map((_, i) => (
              <span key={i} className={i < code.length ? styles.pointPlein : styles.pointVide} />
            ))}
          </p>
          {codeFaux && <p className={styles.alerte}>Code incorrect</p>}
          <div className={styles.chiffres}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((c, i) =>
              c === "" ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  className={styles.chiffre}
                  onClick={() => (c === "⌫" ? setCode(code.slice(0, -1)) : taperChiffre(c))}
                >
                  {c}
                </button>
              )
            )}
          </div>
          <button type="button" className={styles.boutonDiscret} onClick={() => { setMode("hector"); setCode(""); setCodeFaux(false); }}>
            Annuler
          </button>
        </section>
      )}

      {/* Le mode parent */}
      {mode === "parent" && (
        <section className={`${styles.carte} ${styles.parent}`}>
          <p className={styles.sousTitreCarte}>👩‍👦 Mode parent</p>

          {choixRaison ? (
            // Étape 2 : choisir la raison → la gommette part dans la base
            <>
              <p className={styles.grand}>{choixRaison === "verte" ? "✅ Bravo, pourquoi ?" : "❌ Pas bien, pourquoi ?"}</p>
              <div className={styles.raisons}>
                {(choixRaison === "verte" ? RAISONS_VERTES : RAISONS_ROUGES).map((raison) => (
                  <button
                    key={raison}
                    type="button"
                    className={`${styles.bouton} ${choixRaison === "verte" ? styles.boutonVert : styles.boutonRouge}`}
                    disabled={occupe}
                    onClick={() => {
                      const type = choixRaison;
                      setChoixRaison(null);
                      modifier(() => insererGommette(type, raison, lundi));
                    }}
                  >
                    Georges {raison}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.boutonDiscret} onClick={() => setChoixRaison(null)}>
                Annuler
              </button>
            </>
          ) : (
            // Étape 1 : les gros boutons et les réglages
            <>
              <div className={styles.grosBoutons}>
                <button type="button" className={`${styles.bouton} ${styles.boutonVert} ${styles.gros}`} onClick={() => { setChoixRaison("verte"); toucherParent(); }}>
                  ✅ Bravo !
                </button>
                <button type="button" className={`${styles.bouton} ${styles.boutonRouge} ${styles.gros}`} onClick={() => { setChoixRaison("rouge"); toucherParent(); }}>
                  ❌ Pas bien
                </button>
              </div>
              <button
                type="button"
                className={styles.bouton}
                disabled={!derniere || occupe}
                onClick={() => modifier(() => supprimerDerniereGommette(lundi))}
              >
                ↩ Annuler la dernière{derniere ? ` (${derniere.type === "verte" ? "🟢" : "🔴"} ${derniere.raison})` : ""}
              </button>

              <div className={styles.reglages}>
                <label className={styles.reglage}>
                  <span>Objectif de la semaine</span>
                  <span className={styles.compteur}>
                    <button type="button" className={styles.petitBouton} disabled={occupe} onClick={() => modifier(() => enregistrerReglages(lundi, { ...reglages, objectif: Math.max(1, reglages.objectif - 1) }))}>−</button>
                    <strong>{reglages.objectif}</strong>
                    <button type="button" className={styles.petitBouton} disabled={occupe} onClick={() => modifier(() => enregistrerReglages(lundi, { ...reglages, objectif: reglages.objectif + 1 }))}>+</button>
                  </span>
                </label>
                <label className={styles.reglage}>
                  <span>Rouges maximum</span>
                  <span className={styles.compteur}>
                    <button type="button" className={styles.petitBouton} disabled={occupe} onClick={() => modifier(() => enregistrerReglages(lundi, { ...reglages, maxRouges: Math.max(0, reglages.maxRouges - 1) }))}>−</button>
                    <strong>{reglages.maxRouges}</strong>
                    <button type="button" className={styles.petitBouton} disabled={occupe} onClick={() => modifier(() => enregistrerReglages(lundi, { ...reglages, maxRouges: reglages.maxRouges + 1 }))}>+</button>
                  </span>
                </label>
                <ChampRecompense
                  valeur={reglages.recompense}
                  occupe={occupe}
                  onValider={(texte) => modifier(() => enregistrerReglages(lundi, { ...reglages, recompense: texte }))}
                />
              </div>

              {confirmerReset ? (
                <p className={styles.confirmation}>
                  Effacer toutes les gommettes de cette semaine (pour tout le monde) ?{" "}
                  <button type="button" className={`${styles.bouton} ${styles.boutonRouge}`} disabled={occupe} onClick={() => { setConfirmerReset(false); modifier(() => supprimerGommettesDeLaSemaine(lundi)); }}>Oui, effacer</button>{" "}
                  <button type="button" className={styles.bouton} onClick={() => setConfirmerReset(false)}>Non</button>
                </p>
              ) : (
                <button type="button" className={styles.boutonDiscret} onClick={() => { setConfirmerReset(true); toucherParent(); }}>
                  🗑 Réinitialiser la semaine
                </button>
              )}

              <button type="button" className={`${styles.bouton} ${styles.boutonPrincipal}`} onClick={fermerParent}>
                Terminé
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}

// Le champ « Récompense » : on tape tranquillement, et on enregistre dans la base quand on
// quitte le champ (ou avec Entrée) — pas une requête à chaque lettre.
function ChampRecompense({ valeur, occupe, onValider }) {
  const [texte, setTexte] = useState(valeur);
  const [editeDepuis, setEditeDepuis] = useState(valeur); // pour suivre les changements venus d'ailleurs

  // Si la récompense a changé sur un autre appareil et qu'on n'est pas en train de la modifier ici.
  if (valeur !== editeDepuis) {
    setEditeDepuis(valeur);
    setTexte(valeur);
  }

  function valider() {
    const propre = texte.trim();
    if (propre && propre !== valeur) onValider(propre);
  }

  return (
    <label className={styles.reglage}>
      <span>Récompense</span>
      <input
        type="text"
        className={styles.champ}
        value={texte}
        disabled={occupe}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        placeholder="ex. une sortie au parc"
      />
    </label>
  );
}

// Une petite pluie de confettis (CSS uniquement) pour la récompense gagnée.
function Confettis() {
  const emojis = ["🎉", "⭐", "🎊", "✨", "🎈"];
  return (
    <div className={styles.confettis} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className={styles.confetti}
          style={{ left: `${(i * 7 + 3) % 100}%`, animationDelay: `${(i % 5) * 0.3}s` }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}
    </div>
  );
}
