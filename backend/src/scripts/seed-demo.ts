// Contenu de DÉMONSTRATION : un site complet et crédible à présenter avant la saisie des vrais contenus.
// Tout est fictif (noms, dates, montants, illustrations). Dev uniquement.
//   npm run seed:demo             crée ce qui manque (peut être relancé sans doublon)
//   npm run seed:demo -- --clear  supprime tout ce que ce script a créé (les pages restent, à réécrire)
// Ce qui a été créé est noté dans la table « settings » (clé demo.manifest) pour pouvoir être retiré proprement.
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { removeStoredFiles, storeUpload } from '../services/media.js';
import { sceneSvg, simplePdf, type SceneKind } from './demo-assets.js';

const prisma = new PrismaClient();
const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
const MANIFEST_KEY = 'demo.manifest';

type Manifest = { ids: Record<string, number[]>; settings: string[] };
const stored = await prisma.setting.findUnique({ where: { key: MANIFEST_KEY } });
const manifest: Manifest = stored ? JSON.parse(stored.value) : { ids: {}, settings: [] };
const has = (model: string) => (manifest.ids[model]?.length ?? 0) > 0;
const note = (model: string, ...ids: number[]) => (manifest.ids[model] = [...(manifest.ids[model] ?? []), ...ids]);
const saveManifest = () =>
  prisma.setting.upsert({ where: { key: MANIFEST_KEY }, update: { value: JSON.stringify(manifest) }, create: { key: MANIFEST_KEY, value: JSON.stringify(manifest) } });

// ---------- Dates (heure de Lomé = UTC) ----------
const DAY = 86_400_000;
const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const at = (days: number, hour = 0, minute = 0) => new Date(today.getTime() + days * DAY + hour * 3_600_000 + minute * 60_000);
/** Le k-ième dimanche passé (0 = le dernier dimanche écoulé, aujourd'hui compris). */
const pastSunday = (k: number) => at(-today.getUTCDay() - 7 * k);
const longDay = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** Prochain 13 décembre (fête de sainte Lucie). */
const nextFeast = () => {
  const d = new Date(Date.UTC(today.getUTCFullYear(), 11, 13));
  return d >= today ? d : new Date(Date.UTC(today.getUTCFullYear() + 1, 11, 13));
};

const p = (...t: string[]) => t.map((x) => `<p>${x}</p>`).join('');
const ul = (...t: string[]) => `<ul>${t.map((x) => `<li>${x}</li>`).join('')}</ul>`;

// ---------- Suppression ----------
async function clear() {
  const ids = (m: string) => manifest.ids[m] ?? [];
  await prisma.album.deleteMany({ where: { id: { in: ids('album') } } }); // les éléments d'album partent avec
  await prisma.bulletin.deleteMany({ where: { id: { in: ids('bulletin') } } });
  await prisma.staffMember.deleteMany({ where: { id: { in: ids('staff') } } });
  await prisma.massSchedule.deleteMany({ where: { id: { in: ids('schedule') } } });
  await prisma.donation.deleteMany({ where: { id: { in: ids('donation') } } });
  await prisma.campaign.deleteMany({ where: { id: { in: ids('campaign') } } });
  await prisma.event.deleteMany({ where: { id: { in: ids('event') } } });
  await prisma.homily.deleteMany({ where: { id: { in: ids('homily') } } });
  await prisma.announcement.deleteMany({ where: { id: { in: ids('announcement') } } });
  await prisma.formSubmission.deleteMany({ where: { id: { in: ids('submission') } } });
  for (const m of await prisma.media.findMany({ where: { id: { in: ids('media') } } })) {
    try {
      await prisma.media.delete({ where: { id: m.id } });
      await removeStoredFiles(uploadDir, m.storagePath);
    } catch {
      console.warn(`Fichier conservé car encore utilisé : ${m.filename}`);
    }
  }
  await prisma.setting.updateMany({ where: { key: { in: manifest.settings } }, data: { value: '' } });
  await prisma.setting.deleteMany({ where: { key: MANIFEST_KEY } });
  console.log('Contenu de démonstration supprimé (les pages sont conservées : réécrivez-les dans Administration › Pages).');
}

// ---------- Création ----------
async function image(kind: SceneKind, palette: 'dawn' | 'day' | 'dusk' | 'night', seed: number, alt: string) {
  const png = await sharp(Buffer.from(sceneSvg(kind, palette, seed))).png().toBuffer();
  const f = await storeUpload(uploadDir, png, `exemple-${kind}-${seed}.png`);
  const m = await prisma.media.create({ data: { ...f, alt } });
  note('media', m.id);
  return m;
}

async function settings() {
  const values: Record<string, string> = {
    'site.tagline': 'Une communauté de foi, de prière et de fraternité',
    'site.address': 'Quartier Baguida, route d’Aného, Lomé – Togo',
    'site.phone': '+228 90 00 00 00',
    'site.contactEmail': 'contact@paroissesaintelucie-baguida.org',
    'site.hours': 'Mardi au vendredi : 8h – 12h et 15h – 18h\nSamedi : 8h – 12h\nDimanche et lundi : fermé',
    'live.label': 'Chaque dimanche à 8h30',
    // Version anglaise
    'site.tagline.en': 'A community of faith, prayer and fellowship',
    'home.welcomeTitle.en': 'Welcome to Sainte Lucie Parish',
    'home.welcomeText.en': 'Whether you are a parishioner, a visitor passing through or a member of the diaspora, we are happy to welcome you. Find here the Mass times, announcements, bulletins and the whole life of our community.',
    'site.hours.en': 'Tuesday to Friday: 8:00 – 12:00 and 15:00 – 18:00\nSaturday: 8:00 – 12:00\nSunday and Monday: closed',
    'live.label.en': 'Every Sunday at 8:30',
  };
  for (const [key, value] of Object.entries(values)) {
    const cur = await prisma.setting.findUnique({ where: { key } });
    if (cur?.value && cur.value !== 'Communauté catholique') continue; // déjà renseigné par la paroisse
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    if (!manifest.settings.includes(key)) manifest.settings.push(key);
  }
}

async function pages() {
  const list: { slug: string; title: string; excerpt: string; content: string }[] = [
    {
      slug: 'mot-du-cure',
      title: 'Le mot du Curé',
      excerpt: 'Que chacun trouve ici une maison où l’on prie, où l’on s’écoute et où l’on repart le cœur plus léger.',
      content:
        p('Chers paroissiens, chers amis, chers visiteurs,', 'C’est une grande joie de vous accueillir sur le site de la paroisse Sainte Lucie de Baguida. Que vous habitiez le quartier depuis toujours, que vous soyez de passage ou que vous nous suiviez depuis l’étranger, vous êtes ici chez vous.') +
        '<blockquote><p>« Je suis la lumière du monde. Celui qui me suit ne marchera pas dans les ténèbres, il aura la lumière de la vie. » (Jean 8, 12)</p></blockquote>' +
        p('Notre sainte patronne, Lucie, dont le nom signifie « lumière », nous rappelle chaque jour notre vocation : accueillir la lumière du Christ et la porter autour de nous, dans nos familles, nos lieux de travail et nos quartiers.') +
        '<h2>Une paroisse qui accueille</h2>' +
        p('Notre communauté se veut une maison ouverte. On y vient pour prier, pour célébrer les grandes étapes de la vie, pour confier une intention, pour demander un conseil ou simplement pour trouver un peu de paix. Les prêtres, les catéchistes et tous les bénévoles sont à votre écoute.') +
        '<h2>Une paroisse qui grandit</h2>' +
        p('La catéchèse des enfants et des adultes, les groupes de prière, les mouvements de jeunes, la chorale, les équipes de service : autant de lieux où chacun peut trouver sa place et faire grandir sa foi. N’hésitez pas à pousser la porte.') +
        '<h2>Une paroisse qui sert</h2>' +
        p('La foi se vit aussi par la charité. Avec votre aide, nous accompagnons les malades, les personnes âgées et les familles en difficulté. Merci à tous ceux qui donnent de leur temps, de leurs talents et de leurs moyens.') +
        p('Je vous souhaite une bonne visite de ce site et, surtout, j’espère avoir la joie de vous rencontrer à l’église.', '<strong>Que le Seigneur vous bénisse et vous garde.</strong>', '<em>Votre curé</em>'),
    },
    {
      slug: 'histoire',
      title: 'Histoire de la paroisse',
      excerpt: 'D’une petite communauté de prière au bord de l’océan à une paroisse vivante : les grandes étapes de notre chemin.',
      content:
        p('<em>Ce texte est un exemple : il sera remplacé par l’histoire réelle de la paroisse, avec ses dates, ses fondateurs et ses photos d’archives.</em>') +
        '<h2>Les premiers pas</h2>' +
        p('Tout commence par quelques familles de pêcheurs et de cultivateurs qui se retrouvent pour prier le chapelet sous un abri de fortune, à deux pas de l’océan. Un catéchiste vient les visiter, puis un prêtre célèbre la messe de temps en temps. La communauté grandit, portée par la ferveur des anciens.') +
        '<h2>La station devient paroisse</h2>' +
        p('Avec l’essor du quartier, la chapelle devient trop petite. Les fidèles se mobilisent : chacun apporte du sable, des briques, quelques journées de travail. L’église actuelle sort de terre grâce à cette générosité. La communauté est alors érigée en paroisse et placée sous le patronage de sainte Lucie, vierge et martyre.') +
        '<h2>Sainte Lucie, notre patronne</h2>' +
        p('Lucie de Syracuse a donné sa vie pour le Christ au début du IV<sup>e</sup> siècle. Son nom évoque la lumière : elle est fêtée le 13 décembre, au cœur de l’Avent, quand l’Église attend Celui qui vient éclairer le monde. Chaque année, la fête patronale rassemble toute la paroisse autour d’une messe solennelle, d’une procession et d’un repas fraternel.') +
        '<h2>Aujourd’hui</h2>' +
        p('La paroisse compte aujourd’hui plusieurs communautés de quartier, de nombreux mouvements et une jeunesse dynamique. Elle poursuit sa mission avec trois priorités :') +
        ul('<strong>annoncer</strong> l’Évangile à tous, enfants, jeunes et adultes ;', '<strong>célébrer</strong> les sacrements avec soin et beauté ;', '<strong>servir</strong> les plus fragiles, dans le quartier et au-delà.'),
    },
    {
      slug: 'vision-mission',
      title: 'Vision et mission',
      excerpt: 'Une communauté fraternelle, enracinée dans la prière, qui porte la lumière du Christ à Baguida et au-delà.',
      content:
        '<h2>Notre vision</h2>' +
        p('Être une communauté fraternelle et missionnaire, où chacun, quel que soit son âge ou son histoire, peut rencontrer le Christ, grandir dans la foi et se mettre au service des autres.') +
        '<h2>Notre mission</h2>' +
        ul(
          '<strong>Prier et célébrer</strong> : offrir des liturgies belles et priantes, où chacun se sent accueilli.',
          '<strong>Former</strong> : accompagner les enfants, les jeunes et les adultes par la catéchèse et la formation biblique.',
          '<strong>Rassembler</strong> : faire vivre la fraternité à travers les communautés de quartier et les mouvements.',
          '<strong>Servir</strong> : être attentifs aux malades, aux personnes seules et aux familles en difficulté.',
          '<strong>Témoigner</strong> : être, comme sainte Lucie, des porteurs de lumière là où nous vivons.',
        ) +
        '<h2>Nos valeurs</h2>' +
        '<h3>L’accueil</h3>' +
        p('Personne n’est étranger dans la maison de Dieu. Nous voulons que chaque visiteur reparte avec le désir de revenir.') +
        '<h3>La coresponsabilité</h3>' +
        p('La paroisse est l’affaire de tous : prêtres, religieux et laïcs portent ensemble la mission, chacun selon ses dons.') +
        '<h3>La transparence</h3>' +
        p('Les dons des fidèles sont gérés avec rigueur. Le Conseil pour les affaires économiques rend compte régulièrement de l’utilisation des ressources.') +
        '<blockquote><p>« Vous êtes la lumière du monde. » (Matthieu 5, 14)</p></blockquote>',
    },
    {
      slug: 'sacrements',
      title: 'Les sacrements',
      excerpt: 'Baptême, eucharistie, confirmation, réconciliation, mariage, onction des malades : les grandes étapes de la vie chrétienne.',
      content:
        p('Les sacrements sont des signes de l’amour de Dieu qui jalonnent toute la vie chrétienne. La paroisse vous accompagne dans leur préparation. Pour toute demande, vous pouvez passer au secrétariat ou utiliser le <a href="/demarches/sacrement">formulaire de demande de sacrement</a>.') +
        '<h2>Le baptême</h2>' +
        p('Le baptême fait entrer dans la famille des enfants de Dieu. Il est proposé à tout âge.') +
        ul('<strong>Petits enfants</strong> : les parents s’inscrivent au secrétariat au moins deux mois avant la date souhaitée et participent à trois rencontres de préparation.', '<strong>Enfants en âge scolaire, jeunes et adultes</strong> : la préparation se fait dans le cadre de la catéchèse (catéchuménat).') +
        '<h2>L’eucharistie (première communion)</h2>' +
        p('Les enfants se préparent à recevoir le Corps du Christ au cours d’un parcours de catéchèse de plusieurs années. Les adultes sont accompagnés par une équipe dédiée.') +
        '<h2>La confirmation</h2>' +
        p('Par la confirmation, le baptisé reçoit la force de l’Esprit Saint pour témoigner de sa foi. Elle est célébrée chaque année par l’évêque ou son délégué.') +
        '<h2>La réconciliation (confession)</h2>' +
        p('Un prêtre est disponible chaque samedi après-midi et sur rendez-vous. Des célébrations pénitentielles sont proposées pendant l’Avent et le Carême. Voir les <a href="/horaires">horaires</a>.') +
        '<h2>Le mariage</h2>' +
        p('Les fiancés prennent contact avec la paroisse <strong>au moins six mois</strong> avant la date envisagée. La préparation comprend des rencontres avec un prêtre et avec des couples accompagnateurs.') +
        '<h2>L’onction des malades</h2>' +
        p('Ce sacrement apporte réconfort et paix aux personnes éprouvées par la maladie ou le grand âge. N’attendez pas le dernier moment : appelez le secrétariat, un prêtre se déplacera à domicile ou à l’hôpital.') +
        '<h2>Pièces à fournir</h2>' +
        ul('extrait d’acte de naissance ;', 'carte ou certificat de baptême (pour la communion, la confirmation et le mariage) ;', 'pour les parrains et marraines : certificat de confirmation.'),
    },
    {
      slug: 'groupes-de-priere',
      title: 'Groupes de prière et mouvements',
      excerpt: 'Chorales, Légion de Marie, Renouveau charismatique, enfants de chœur… Trouvez le groupe qui vous correspond.',
      content:
        p('La paroisse vit grâce à ses nombreux groupes. Chacun a son charisme, ses horaires et ses responsables. Vous êtes les bienvenus pour une première rencontre, sans engagement.') +
        '<h2>Prière et louange</h2>' +
        ul(
          '<strong>Renouveau charismatique</strong> : louange, écoute de la Parole et intercession. Chaque mardi à 18h30, à l’église.',
          '<strong>Légion de Marie</strong> : prière du chapelet et visites aux malades. Chaque jeudi à 17h, salle Saint-Joseph.',
          '<strong>Groupe du Sacré-Cœur</strong> : adoration et messe du premier vendredi du mois.',
          '<strong>Rosaire vivant</strong> : chapelet médité chaque soir d’octobre et de mai.',
        ) +
        '<h2>Liturgie et chant</h2>' +
        ul(
          '<strong>Chorale Sainte Cécile</strong> (français) : répétitions le mercredi et le vendredi à 19h.',
          '<strong>Chorale Hanyé</strong> (éwé) : répétitions le mardi et le jeudi à 19h.',
          '<strong>Lecteurs</strong> : préparation des lectures le samedi à 16h.',
          '<strong>Servants d’autel</strong> : pour les enfants et les jeunes à partir de 8 ans, le samedi à 15h.',
        ) +
        '<h2>Fraternité et service</h2>' +
        ul(
          '<strong>Communautés de quartier (CCB)</strong> : partage de la Parole dans les maisons, une fois par semaine.',
          '<strong>Caritas paroissiale</strong> : aide aux familles en difficulté, visites aux malades et aux prisonniers.',
          '<strong>Femmes catholiques</strong> et <strong>Hommes catholiques</strong> : rencontres mensuelles, entraide et formation.',
        ) +
        p('Vous souhaitez rejoindre un groupe ? Écrivez-nous par la page <a href="/contact">Contact</a> ou présentez-vous au secrétariat.'),
    },
    {
      slug: 'catechese',
      title: 'Catéchèse et formation',
      excerpt: 'Un parcours pour chaque âge : éveil à la foi, première communion, confirmation et catéchuménat des adultes.',
      content:
        p('La catéchèse aide chacun à connaître Jésus, à prier et à vivre en chrétien. Elle s’adresse aux enfants, aux jeunes et aux adultes. Les rencontres ont lieu <strong>le samedi de 15h à 17h</strong> et <strong>le dimanche après la messe de 8h30</strong>.') +
        '<h2>Les étapes du parcours</h2>' +
        ul(
          '<strong>Éveil à la foi</strong> (5 – 7 ans) : découvrir Dieu par le chant, les récits et la prière.',
          '<strong>Préparation au baptême</strong> : pour les enfants en âge scolaire qui ne sont pas encore baptisés.',
          '<strong>Première communion</strong> : trois années de cheminement.',
          '<strong>Profession de foi</strong> : approfondir et dire soi-même « je crois ».',
          '<strong>Confirmation</strong> : deux années, à partir de 13 ans.',
          '<strong>Adultes (catéchuménat)</strong> : un accompagnement personnalisé vers les sacrements.',
        ) +
        '<h2>S’inscrire</h2>' +
        p('Les inscriptions se font en début d’année pastorale, au secrétariat ou en ligne avec le <a href="/demarches/catechisme">formulaire d’inscription</a>. Merci de vous munir d’un extrait d’acte de naissance et, le cas échéant, de la carte de baptême.') +
        '<h2>Devenir catéchiste</h2>' +
        p('La paroisse a besoin de catéchistes ! Une formation est assurée tout au long de l’année. Si vous aimez transmettre et que vous disposez de deux heures par semaine, parlez-en à un prêtre ou au responsable de la catéchèse.') +
        '<blockquote><p>« Laissez les enfants venir à moi. » (Marc 10, 14)</p></blockquote>',
    },
    {
      slug: 'jeunesse',
      title: 'Jeunesse',
      excerpt: 'Mouvements, rencontres, sport, camps et temps de prière : la paroisse fait une grande place aux jeunes.',
      content:
        p('Les jeunes ne sont pas seulement l’avenir de l’Église : ils en sont le présent. À Sainte Lucie, ils animent des messes, organisent des sorties, rendent service et se forment ensemble.') +
        '<h2>Les mouvements</h2>' +
        ul(
          '<strong>Cœurs Vaillants – Âmes Vaillantes (CV-AV)</strong> : pour les 6 – 14 ans, jeux, chants et formation humaine et chrétienne, le dimanche à 15h.',
          '<strong>Scouts et guides</strong> : vie en équipe, nature et service, le samedi à 15h.',
          '<strong>Jeunesse étudiante catholique (JEC)</strong> : pour les collégiens et lycéens.',
          '<strong>Groupe des jeunes adultes</strong> : étudiants et jeunes professionnels, un vendredi sur deux à 19h.',
        ) +
        '<h2>Les temps forts de l’année</h2>' +
        ul('la messe des jeunes, chaque dernier dimanche du mois ;', 'la journée de récollection de rentrée ;', 'la veillée de Noël et le chemin de croix animés par les jeunes ;', 'le camp d’été et la sortie à la plage de Baguida ;', 'le tournoi de football inter-mouvements.') +
        '<h2>Nous rejoindre</h2>' +
        p('Viens comme tu es ! Présente-toi à l’aumônier des jeunes après la messe ou écris-nous par la page <a href="/contact">Contact</a>.'),
    },
    {
      slug: 'sengager',
      title: 'S’engager',
      excerpt: 'Chacun a reçu un don à mettre au service de tous. Découvrez les services qui ont besoin de vous.',
      content:
        p('Une paroisse vivante repose sur l’engagement de ses membres. Une heure par semaine ou par mois : chaque geste compte. Voici quelques services où vous pouvez trouver votre place.') +
        '<h2>Au service de la liturgie</h2>' +
        ul('chanter dans une chorale ou jouer d’un instrument ;', 'proclamer la Parole (lecteurs) ;', 'servir à l’autel ;', 'fleurir et entretenir l’église ;', 'assurer l’accueil et le service d’ordre aux messes.') +
        '<h2>Au service de la foi</h2>' +
        ul('devenir catéchiste ou accompagnateur de catéchumènes ;', 'animer une communauté de quartier ;', 'accompagner les fiancés ou les parents qui demandent le baptême.') +
        '<h2>Au service des frères</h2>' +
        ul('rejoindre la Caritas paroissiale ;', 'visiter les malades et les personnes âgées ;', 'participer aux journées de salubrité et aux travaux de la paroisse.') +
        '<h2>Au service de la communication</h2>' +
        ul('rédiger le bulletin paroissial ;', 'prendre des photos et des vidéos des célébrations ;', 'aider à la retransmission de la messe en direct.') +
        p('Envie de vous lancer ? Remplissez le <a href="/demarches/adhesion">formulaire d’adhésion</a> ou parlez-en à un membre de l’équipe pastorale. Vous pouvez aussi <a href="/dons">soutenir la paroisse par un don</a>.'),
    },
    {
      slug: 'dons',
      title: 'Dons et soutien',
      excerpt: 'Soutenir la vie et les projets de la paroisse.',
      content: p('La paroisse ne vit que des dons de ses fidèles et de ses amis. Votre générosité permet d’entretenir l’église, de former les catéchistes, d’aider les familles en difficulté et de mener à bien nos projets. <strong>Merci de votre soutien, quel qu’en soit le montant.</strong>'),
    },
  ];
  // Version anglaise des mêmes pages (site en « /en/… »).
  const listEn: typeof list = [
    {
      slug: 'mot-du-cure',
      title: 'A word from the Parish Priest',
      excerpt: 'May everyone find here a home where we pray, listen to one another and leave with a lighter heart.',
      content:
        p('Dear parishioners, dear friends, dear visitors,', 'It is a great joy to welcome you to the website of Sainte Lucie Parish in Baguida. Whether you have always lived in the neighbourhood, are passing through or follow us from abroad, you are at home here.') +
        '<blockquote><p>“I am the light of the world. Whoever follows me will not walk in darkness, but will have the light of life.” (John 8:12)</p></blockquote>' +
        p('Our patron saint, Lucy, whose name means “light”, reminds us every day of our calling: to welcome the light of Christ and carry it around us, in our families, our workplaces and our neighbourhoods.') +
        '<h2>A parish that welcomes</h2>' +
        p('Our community wants to be an open house. People come to pray, to celebrate the great moments of life, to entrust an intention, to ask for advice or simply to find a little peace. The priests, catechists and all the volunteers are here to listen.') +
        '<h2>A parish that grows</h2>' +
        p('Catechesis for children and adults, prayer groups, youth movements, the choir, service teams: so many places where everyone can find their place and grow in faith. Do not hesitate to come in.') +
        '<h2>A parish that serves</h2>' +
        p('Faith is also lived through charity. With your help, we accompany the sick, the elderly and families in difficulty. Thank you to all who give their time, talents and means.') +
        p('I wish you a good visit of this site and, above all, I hope to have the joy of meeting you at church.', '<strong>May the Lord bless you and keep you.</strong>', '<em>Your Parish Priest</em>'),
    },
    {
      slug: 'histoire',
      title: 'History of the parish',
      excerpt: 'From a small prayer community by the ocean to a living parish: the main stages of our journey.',
      content:
        p('<em>This text is an example: it will be replaced by the real history of the parish, with its dates, founders and archive photographs.</em>') +
        '<h2>The first steps</h2>' +
        p('It all began with a few families of fishermen and farmers who gathered to pray the rosary under a makeshift shelter, a stone’s throw from the ocean. A catechist came to visit them, then a priest celebrated Mass from time to time. The community grew, carried by the fervour of the elders.') +
        '<h2>The outstation becomes a parish</h2>' +
        p('As the neighbourhood developed, the chapel became too small. The faithful rallied round: everyone brought sand, bricks and a few days of work. The present church rose thanks to this generosity. The community was then established as a parish under the patronage of Saint Lucy, virgin and martyr.') +
        '<h2>Saint Lucy, our patron</h2>' +
        p('Lucy of Syracuse gave her life for Christ at the beginning of the 4th century. Her name evokes light: her feast is celebrated on 13 December, in the heart of Advent. Each year the patronal feast gathers the whole parish around a solemn Mass, a procession and a shared meal.') +
        '<h2>Today</h2>' +
        p('The parish now has several neighbourhood communities, many movements and a dynamic youth. It continues its mission with three priorities:') +
        ul('<strong>proclaiming</strong> the Gospel to all, children, young people and adults;', '<strong>celebrating</strong> the sacraments with care and beauty;', '<strong>serving</strong> the most vulnerable, in the neighbourhood and beyond.'),
    },
    {
      slug: 'vision-mission',
      title: 'Vision and mission',
      excerpt: 'A fraternal community, rooted in prayer, carrying the light of Christ to Baguida and beyond.',
      content:
        '<h2>Our vision</h2>' +
        p('To be a fraternal and missionary community where everyone, whatever their age or story, can meet Christ, grow in faith and serve others.') +
        '<h2>Our mission</h2>' +
        ul(
          '<strong>Pray and celebrate</strong>: offer beautiful, prayerful liturgies where everyone feels welcome.',
          '<strong>Form</strong>: accompany children, young people and adults through catechesis and biblical formation.',
          '<strong>Gather</strong>: bring fraternity to life through neighbourhood communities and movements.',
          '<strong>Serve</strong>: be attentive to the sick, the lonely and families in difficulty.',
          '<strong>Witness</strong>: be, like Saint Lucy, bearers of light where we live.',
        ) +
        '<h2>Our values</h2>' +
        '<h3>Welcome</h3>' +
        p('No one is a stranger in the house of God. We want every visitor to leave wishing to come back.') +
        '<h3>Shared responsibility</h3>' +
        p('The parish is everyone’s concern: priests, religious and lay people carry the mission together, each according to their gifts.') +
        '<h3>Transparency</h3>' +
        p('The gifts of the faithful are managed rigorously. The Finance Council reports regularly on how resources are used.') +
        '<blockquote><p>“You are the light of the world.” (Matthew 5:14)</p></blockquote>',
    },
    {
      slug: 'sacrements',
      title: 'The sacraments',
      excerpt: 'Baptism, Eucharist, confirmation, reconciliation, marriage, anointing of the sick: the great stages of Christian life.',
      content:
        p('The sacraments are signs of God’s love that mark the whole of Christian life. The parish accompanies you in preparing for them. For any request, you can call at the parish office or use the <a href="/en/demarches/sacrement">sacrament request form</a>.') +
        '<h2>Baptism</h2>' +
        p('Baptism brings us into the family of God’s children. It is offered at any age.') +
        ul('<strong>Infants</strong>: parents register at the parish office at least two months before the desired date and take part in three preparation meetings.', '<strong>School-age children, young people and adults</strong>: preparation takes place within catechesis (the catechumenate).') +
        '<h2>The Eucharist (First Communion)</h2>' +
        p('Children prepare to receive the Body of Christ over several years of catechesis. Adults are accompanied by a dedicated team.') +
        '<h2>Confirmation</h2>' +
        p('Through confirmation, the baptised receive the strength of the Holy Spirit to bear witness to their faith. It is celebrated each year by the bishop or his delegate.') +
        '<h2>Reconciliation (confession)</h2>' +
        p('A priest is available every Saturday afternoon and by appointment. Penitential services are offered during Advent and Lent. See the <a href="/en/horaires">Mass times</a>.') +
        '<h2>Marriage</h2>' +
        p('Engaged couples contact the parish <strong>at least six months</strong> before the planned date. Preparation includes meetings with a priest and with accompanying couples.') +
        '<h2>Anointing of the sick</h2>' +
        p('This sacrament brings comfort and peace to those tried by illness or old age. Do not wait until the last moment: call the parish office and a priest will come to the home or hospital.') +
        '<h2>Documents required</h2>' +
        ul('birth certificate;', 'baptism card or certificate (for communion, confirmation and marriage);', 'for godparents: confirmation certificate.'),
    },
    {
      slug: 'groupes-de-priere',
      title: 'Prayer groups and movements',
      excerpt: 'Choirs, Legion of Mary, Charismatic Renewal, altar servers… Find the group that suits you.',
      content:
        p('The parish lives thanks to its many groups. Each has its own charism, schedule and leaders. You are welcome to come to a first meeting, with no commitment.') +
        '<h2>Prayer and praise</h2>' +
        ul('<strong>Charismatic Renewal</strong>: praise, listening to the Word and intercession. Every Tuesday at 18:30, in the church.', '<strong>Legion of Mary</strong>: rosary and visits to the sick. Every Thursday at 17:00.', '<strong>Sacred Heart group</strong>: adoration and Mass on the first Friday of the month.') +
        '<h2>Liturgy and song</h2>' +
        ul('<strong>Sainte Cécile choir</strong> (French): rehearsals on Wednesday and Friday at 19:00.', '<strong>Hanyé choir</strong> (Ewe): rehearsals on Tuesday and Thursday at 19:00.', '<strong>Readers</strong>: preparation of the readings on Saturday at 16:00.', '<strong>Altar servers</strong>: for children and young people from the age of 8, on Saturday at 15:00.') +
        '<h2>Fraternity and service</h2>' +
        ul('<strong>Neighbourhood communities</strong>: sharing the Word in homes, once a week.', '<strong>Parish Caritas</strong>: help for families in difficulty, visits to the sick and prisoners.', '<strong>Catholic Women</strong> and <strong>Catholic Men</strong>: monthly meetings, mutual support and formation.') +
        p('Would you like to join a group? Write to us through the <a href="/en/contact">Contact</a> page or call at the parish office.'),
    },
    {
      slug: 'catechese',
      title: 'Catechesis and formation',
      excerpt: 'A path for every age: awakening to faith, First Communion, confirmation and the adult catechumenate.',
      content:
        p('Catechesis helps everyone to know Jesus, to pray and to live as a Christian. It is for children, young people and adults. Sessions take place <strong>on Saturday from 15:00 to 17:00</strong> and <strong>on Sunday after the 8:30 Mass</strong>.') +
        '<h2>The stages</h2>' +
        ul('<strong>Awakening to faith</strong> (ages 5–7): discovering God through song, stories and prayer.', '<strong>Preparation for baptism</strong>: for school-age children who are not yet baptised.', '<strong>First Communion</strong>: a three-year journey.', '<strong>Profession of faith</strong>: going deeper and saying “I believe” for oneself.', '<strong>Confirmation</strong>: two years, from the age of 13.', '<strong>Adults (catechumenate)</strong>: personal accompaniment towards the sacraments.') +
        '<h2>Enrolling</h2>' +
        p('Enrolment takes place at the start of the pastoral year, at the parish office or online with the <a href="/en/demarches/catechisme">enrolment form</a>. Please bring a birth certificate and, where applicable, the baptism card.') +
        '<h2>Becoming a catechist</h2>' +
        p('The parish needs catechists! Training is provided throughout the year. If you enjoy passing on the faith and have two hours a week, speak to a priest or to the head of catechesis.') +
        '<blockquote><p>“Let the little children come to me.” (Mark 10:14)</p></blockquote>',
    },
    {
      slug: 'jeunesse',
      title: 'Youth',
      excerpt: 'Movements, gatherings, sport, camps and times of prayer: the parish gives young people a big place.',
      content:
        p('Young people are not only the future of the Church: they are its present. At Sainte Lucie they lead Masses, organise outings, serve and learn together.') +
        '<h2>The movements</h2>' +
        ul('<strong>Cœurs Vaillants – Âmes Vaillantes (CV-AV)</strong>: for ages 6–14, games, songs and human and Christian formation, on Sunday at 15:00.', '<strong>Scouts and guides</strong>: team life, nature and service, on Saturday at 15:00.', '<strong>Young Catholic Students (JEC)</strong>: for secondary-school pupils.', '<strong>Young adults group</strong>: students and young professionals, every other Friday at 19:00.') +
        '<h2>Highlights of the year</h2>' +
        ul('the youth Mass, every last Sunday of the month;', 'the back-to-school day of recollection;', 'the Christmas vigil and the Way of the Cross led by young people;', 'the summer camp and the outing to Baguida beach;', 'the inter-movement football tournament.') +
        '<h2>Join us</h2>' +
        p('Come as you are! Introduce yourself to the youth chaplain after Mass or write to us through the <a href="/en/contact">Contact</a> page.'),
    },
    {
      slug: 'sengager',
      title: 'Get involved',
      excerpt: 'Everyone has received a gift to put at the service of all. Discover the services that need you.',
      content:
        p('A living parish relies on the commitment of its members. An hour a week or a month: every gesture counts. Here are a few services where you can find your place.') +
        '<h2>Serving the liturgy</h2>' +
        ul('sing in a choir or play an instrument;', 'proclaim the Word (readers);', 'serve at the altar;', 'decorate and look after the church;', 'welcome people and help with order at Masses.') +
        '<h2>Serving the faith</h2>' +
        ul('become a catechist or accompany catechumens;', 'lead a neighbourhood community;', 'accompany engaged couples or parents asking for baptism.') +
        '<h2>Serving our brothers and sisters</h2>' +
        ul('join the parish Caritas;', 'visit the sick and the elderly;', 'take part in clean-up days and parish works.') +
        '<h2>Serving communication</h2>' +
        ul('write the parish bulletin;', 'take photos and videos of celebrations;', 'help broadcast the Mass live.') +
        p('Ready to start? Fill in the <a href="/en/demarches/adhesion">registration form</a> or speak to a member of the pastoral team. You can also <a href="/en/dons">support the parish with a gift</a>.'),
    },
    {
      slug: 'dons',
      title: 'Giving and support',
      excerpt: 'Support the life and projects of the parish.',
      content: p('The parish lives only on the gifts of its faithful and friends. Your generosity makes it possible to maintain the church, train catechists, help families in difficulty and carry out our projects. <strong>Thank you for your support, whatever the amount.</strong>'),
    },
  ];

  for (const [locale, pagesOfLocale] of [['fr', list], ['en', listEn]] as const) {
    for (const pg of pagesOfLocale) {
      const where = { slug_locale: { slug: pg.slug, locale } };
      const cur = await prisma.page.findUnique({ where });
      if (!cur) {
        const created = await prisma.page.create({ data: { ...pg, locale, status: 'PUBLISHED', publishedAt: new Date() } });
        note('page', created.id);
      } else if (cur.content.includes('[Texte provisoire]') || manifest.ids.page?.includes(cur.id)) {
        await prisma.page.update({ where, data: pg });
        if (!manifest.ids.page?.includes(cur.id)) note('page', cur.id);
      }
    }
  }
}

async function announcements() {
  if (has('announcement')) return;
  const feast = longDay(nextFeast());
  const list = [
    {
      title: 'Bienvenue sur le nouveau site de la paroisse',
      pinned: true,
      days: 0,
      content:
        p('La paroisse Sainte Lucie de Baguida se dote d’un nouveau site internet. Vous y trouverez les <a href="/horaires">horaires des messes</a>, l’<a href="/agenda">agenda</a>, les <a href="/bulletins">bulletins</a>, les <a href="/homelies">homélies</a> et les photos de nos célébrations.') +
        p('Vous pouvez aussi faire vos démarches en ligne : inscription au catéchisme, demande de sacrement, intention de messe, et soutenir la paroisse par un <a href="/dons">don sécurisé</a>.'),
    },
    {
      title: 'Inscriptions à la catéchèse : c’est le moment',
      days: 2,
      content:
        p('Les inscriptions pour la nouvelle année de catéchèse sont ouvertes pour les enfants, les jeunes et les adultes.') +
        ul('au secrétariat, du mardi au samedi ;', 'ou en ligne, avec le <a href="/demarches/catechisme">formulaire d’inscription</a>.') +
        p('Pièces à fournir : extrait d’acte de naissance et, pour les baptisés, carte de baptême.'),
    },
    {
      title: 'Fête patronale de Sainte Lucie : préparons-nous',
      days: 4,
      content:
        p(`Notre fête patronale sera célébrée le <strong>${feast}</strong>. Elle sera précédée d’une neuvaine de prière chaque soir à 18h30.`) +
        p('Les groupes et mouvements qui souhaitent participer à l’animation (chants, procession, repas fraternel) sont invités à se signaler au secrétariat.'),
    },
    {
      title: 'Appel aux bénévoles : chorale, accueil et retransmission',
      days: 7,
      content: p('La paroisse recherche des choristes (toutes voix), des personnes pour l’accueil aux messes du dimanche et des volontaires pour la retransmission vidéo. Une formation est assurée.') + p('Pour vous proposer, utilisez le <a href="/demarches/adhesion">formulaire d’adhésion</a> ou parlez-en à un prêtre après la messe.'),
    },
    {
      title: 'Nouvelle salle paroissiale : la collecte est lancée',
      days: 11,
      content: p('Pour accueillir la catéchèse, les réunions et les fêtes de famille, la paroisse construit une salle polyvalente. Chaque contribution compte, même modeste.') + p('Suivez l’avancement de la collecte et participez sur la page <a href="/dons">Faire un don</a>.'),
    },
  ];
  for (const a of list) {
    const row = await prisma.announcement.create({ data: { title: a.title, content: a.content, pinned: a.pinned ?? false, status: 'PUBLISHED', publishedAt: at(-a.days, 8) } });
    note('announcement', row.id);
  }
}

async function schedules() {
  if (has('schedule')) return;
  type Row = [string, string, 'MASS' | 'CONFESSION' | 'ADORATION' | 'OTHER', string | null, string | null];
  const church = 'Église paroissiale';
  const rows: Row[] = [
    ['MONDAY', '06:15', 'MASS', 'Français', null],
    ['TUESDAY', '06:15', 'MASS', 'Français', null],
    ['TUESDAY', '18:30', 'OTHER', null, 'Prière du Renouveau charismatique'],
    ['WEDNESDAY', '06:15', 'MASS', 'Éwé', null],
    ['WEDNESDAY', '18:30', 'MASS', 'Français', 'Messe du soir'],
    ['THURSDAY', '06:15', 'MASS', 'Français', null],
    ['THURSDAY', '18:00', 'ADORATION', null, 'Adoration eucharistique'],
    ['FRIDAY', '06:15', 'MASS', 'Français', null],
    ['FRIDAY', '18:30', 'MASS', 'Français', 'Messe suivie du chapelet'],
    ['SATURDAY', '06:30', 'MASS', 'Français', null],
    ['SATURDAY', '16:00', 'CONFESSION', null, 'Jusqu’à 17h30'],
    ['SATURDAY', '18:30', 'MASS', 'Français', 'Messe anticipée du dimanche'],
    ['SUNDAY', '06:30', 'MASS', 'Éwé', null],
    ['SUNDAY', '08:30', 'MASS', 'Français', 'Messe des familles'],
    ['SUNDAY', '10:30', 'MASS', 'Éwé et français', 'Grand-messe'],
    ['SUNDAY', '18:00', 'MASS', 'Français', 'Messe du soir'],
  ];
  let i = 0;
  for (const [weekday, time, kind, language, notes] of rows) {
    const row = await prisma.massSchedule.create({ data: { weekday: weekday as never, time, kind, language, notes, location: church, sortOrder: ++i } });
    note('schedule', row.id);
  }
}

const STAFF = [
  { fullName: 'Abbé Emmanuel Kossi AMEGAH', function: 'Curé', bio: 'Ordonné prêtre il y a une quinzaine d’années, il a servi dans plusieurs paroisses du diocèse avant d’être nommé à Baguida. Il accompagne particulièrement les familles et les fiancés.' },
  { fullName: 'Abbé Pascal Dodji AGBODJAN', function: 'Vicaire', bio: 'Aumônier des jeunes et des mouvements d’action catholique, il anime aussi la pastorale des vocations et la chorale des enfants.' },
  { fullName: 'Sœur Marie-Claire TOSSOU', function: 'Responsable de la catéchèse', bio: 'Religieuse, elle coordonne l’équipe des catéchistes et le catéchuménat des adultes. Elle reçoit les parents le samedi matin.' },
  { fullName: 'M. Kodjo Mawuli SOSSOU', function: 'Catéchiste principal', bio: 'Au service de la paroisse depuis plus de vingt ans, il prépare les enfants à la première communion et anime une communauté de quartier.' },
  { fullName: 'Mme Akouvi Reine DOGBE', function: 'Secrétaire paroissiale', bio: 'Elle vous accueille au secrétariat pour les inscriptions, les intentions de messe, les certificats et toutes vos démarches.' },
  { fullName: 'M. Yao Sélom KPODAR', function: 'Président du Conseil pastoral', bio: 'Avec les membres du Conseil, il aide les prêtres à discerner les priorités de la paroisse et à coordonner les groupes.' },
];

async function staff() {
  if (has('staff')) return;
  let i = 0;
  for (const s of STAFF) note('staff', (await prisma.staffMember.create({ data: { ...s, sortOrder: ++i } })).id);
}

async function events() {
  if (has('event')) return;
  const cats = Object.fromEntries((await prisma.eventCategory.findMany()).map((c) => [c.slug, c.id]));
  const feast = nextFeast();
  const feastDays = Math.round((feast.getTime() - today.getTime()) / DAY);
  const list: { title: string; cat: string; start: Date; end?: Date; allDay?: boolean; location: string; description: string }[] = [
    { title: 'Messe de rentrée pastorale', cat: 'messe', start: at(-10, 8, 30), end: at(-10, 10, 30), location: 'Église paroissiale', description: 'Messe d’envoi en mission de tous les groupes et mouvements, suivie d’un verre de l’amitié.' },
    { title: 'Répétition de la chorale Sainte Cécile', cat: 'communaute', start: at(2, 19), end: at(2, 20, 30), location: 'Église paroissiale', description: 'Préparation des chants du dimanche. Les nouveaux choristes sont les bienvenus.' },
    { title: 'Rentrée de la catéchèse', cat: 'catechese', start: at(4, 15), end: at(4, 17), location: 'Salles de catéchèse', description: 'Accueil des enfants et des parents, répartition dans les groupes et remise du calendrier de l’année.\nMerci d’apporter un cahier et la carte de baptême.' },
    { title: 'Chapelet médité et adoration', cat: 'messe', start: at(6, 18), end: at(6, 19), location: 'Église paroissiale', description: 'Prière du chapelet animée par la Légion de Marie, suivie d’un temps d’adoration silencieuse.' },
    { title: 'Récollection des jeunes', cat: 'jeunesse', start: at(10, 8), end: at(10, 16), location: 'Centre spirituel (départ devant l’église)', description: 'Une journée pour prier, échanger et repartir du bon pied.\nParticipation : 1 000 FCFA (repas compris). Inscription auprès des responsables de mouvements.' },
    { title: 'Réunion du Conseil pastoral paroissial', cat: 'communaute', start: at(13, 18, 30), end: at(13, 20), location: 'Salle Saint-Joseph', description: 'Ordre du jour : calendrier de l’Avent, fête patronale, point sur la construction de la salle paroissiale.' },
    { title: 'Journée de salubrité', cat: 'communaute', start: at(17), allDay: true, location: 'Église et cour de la paroisse', description: 'Nettoyage de l’église, de la cour et des abords. Venez avec balais, râteaux et bonne humeur !' },
    { title: 'Triduum de prière pour les vocations', cat: 'messe', start: at(24, 18, 30), end: at(26, 20), location: 'Église paroissiale', description: 'Trois soirées de prière, d’enseignement et de témoignages. Messe de clôture le troisième soir.' },
    { title: 'Formation des catéchistes', cat: 'catechese', start: at(31, 9), end: at(31, 12), location: 'Salle Saint-Joseph', description: 'Thème : « Raconter la Bible aux enfants ». Ouverte à tous ceux qui souhaitent devenir catéchistes.' },
    { title: 'Kermesse paroissiale', cat: 'communaute', start: at(38), allDay: true, location: 'Cour de la paroisse', description: 'Stands, jeux, tombola, grillades et concert des chorales. Les bénéfices iront à la construction de la salle paroissiale.' },
    { title: 'Tournoi de football inter-mouvements', cat: 'jeunesse', start: at(45, 15), end: at(45, 18), location: 'Terrain du collège', description: 'Finale et remise des trophées à 17h30.' },
  ];
  if (feastDays > 0) {
    list.push({ title: 'Fête patronale : solennité de sainte Lucie', cat: 'messe', start: new Date(feast.getTime() + 9 * 3_600_000), end: new Date(feast.getTime() + 14 * 3_600_000), location: 'Église paroissiale', description: 'Messe solennelle à 9h, procession, puis repas fraternel dans la cour de la paroisse.\nLa neuvaine préparatoire commence neuf jours avant, chaque soir à 18h30.' });
  }
  for (const e of list) {
    const row = await prisma.event.create({ data: { title: e.title, description: e.description, location: e.location, startsAt: e.start, endsAt: e.end ?? null, allDay: e.allDay ?? false, status: 'PUBLISHED', categoryId: cats[e.cat] ?? null } });
    note('event', row.id);
  }
}

async function homilies() {
  if (has('homily')) return;
  const list = [
    {
      title: 'La lumière qui ne s’éteint pas',
      preacher: STAFF[0]!.fullName,
      content:
        p('Frères et sœurs, il suffit d’une petite flamme pour faire reculer la nuit. Celui qui a déjà marché dans l’obscurité avec une simple lampe le sait : on ne voit pas tout le chemin, mais on voit assez pour faire le pas suivant.') +
        '<h2>Une lumière reçue</h2>' +
        p('Au jour de notre baptême, un cierge a été allumé au cierge pascal et remis à nos parents avec ces mots : « Recevez la lumière du Christ. » Cette lumière ne vient pas de nous. Nous la recevons, jour après jour, dans la prière, dans la Parole et dans l’eucharistie.') +
        '<h2>Une lumière à partager</h2>' +
        p('Une lampe ne s’allume pas pour être mise sous le boisseau. Un mot d’encouragement, une visite à un malade, un pardon accordé : voilà comment la lumière passe de main en main.') +
        '<blockquote><p>« Que votre lumière brille devant les hommes. » (Matthieu 5, 16)</p></blockquote>' +
        p('Demandons à sainte Lucie, notre patronne, de nous apprendre à garder notre lampe allumée. Amen.'),
    },
    {
      title: 'Prier sans se décourager',
      preacher: STAFF[1]!.fullName,
      content:
        p('Jésus nous raconte l’histoire d’une veuve qui, à force d’insister, finit par obtenir justice. Si un juge sans cœur finit par céder, combien plus notre Père écoutera-t-il ses enfants !') +
        '<h2>La prière qui dure</h2>' +
        p('Nous aimons les réponses rapides. Mais la prière n’est pas un distributeur automatique : elle est une relation. En persévérant, c’est notre cœur qui s’élargit, jusqu’à désirer ce que Dieu veut nous donner.') +
        '<h2>Prier ensemble</h2>' +
        p('Comme Moïse dont les bras étaient soutenus par Aaron et Hour, nous avons besoin les uns des autres pour tenir. C’est le sens de nos communautés de quartier et de nos groupes de prière : personne ne prie seul.') +
        p('Cette semaine, choisissons un moment fixe, même court, pour nous tenir devant Dieu. Et tenons bon.'),
    },
    {
      title: 'Dix ont été guéris, un seul est revenu',
      preacher: STAFF[0]!.fullName,
      content:
        p('Dix lépreux crient vers Jésus. Dix sont purifiés en chemin. Un seul revient sur ses pas pour dire merci, et c’est un étranger.') +
        '<h2>La mémoire du cœur</h2>' +
        p('La gratitude est la mémoire du cœur. Nous savons demander ; savons-nous remercier ? Chaque eucharistie – le mot veut dire « action de grâce » – nous apprend à revenir vers Celui qui nous a comblés.') +
        '<h2>Un exercice pour la semaine</h2>' +
        p('Chaque soir, avant de dormir, nommons trois raisons de dire merci : une rencontre, un repas partagé, une difficulté surmontée. Peu à peu, notre regard changera.') +
        p('« Relève-toi et va : ta foi t’a sauvé. » Que cette parole soit aussi pour nous.'),
    },
    {
      title: 'Augmente en nous la foi',
      preacher: STAFF[1]!.fullName,
      content:
        p('« Augmente en nous la foi ! » La demande des Apôtres est aussi la nôtre. Devant les épreuves, la maladie, les soucis d’argent ou les conflits de famille, nous nous sentons souvent bien petits.') +
        '<h2>Une graine suffit</h2>' +
        p('Jésus ne répond pas en donnant une plus grande quantité de foi. Il parle d’une graine de moutarde : ce qui compte n’est pas la taille de notre foi, mais Celui en qui nous la plaçons.') +
        '<h2>Des serviteurs heureux</h2>' +
        p('La foi grandit quand on la met en pratique : en servant, simplement, là où nous sommes. Le serviteur de l’Évangile ne réclame pas de médaille ; sa joie est d’avoir fait ce qu’il devait faire.') +
        p('Seigneur, nous croyons : viens au secours de notre peu de foi.'),
    },
  ];
  for (const [i, h] of list.entries()) {
    const date = pastSunday(i);
    const row = await prisma.homily.create({ data: { ...h, date, status: 'PUBLISHED', publishedAt: new Date(date.getTime() + 14 * 3_600_000) } });
    note('homily', row.id);
  }
}

async function bulletins() {
  if (has('bulletin')) return;
  for (let i = 0; i < 4; i++) {
    const sunday = pastSunday(i);
    const day = longDay(sunday);
    const pdf = simplePdf('Bulletin paroissial', `Paroisse Sainte Lucie de Baguida - Dimanche ${day}`, [
      '# Le mot de la semaine',
      'Chers paroissiens, cette semaine encore le Seigneur nous rassemble pour écouter sa Parole et partager le pain. Que chacun se sente accueilli et envoyé en mission dans son quartier.',
      '# Messes du dimanche',
      '6h30 (éwé) - 8h30 (français, messe des familles) - 10h30 (grand-messe) - 18h00 (messe du soir).',
      '# En semaine',
      'Messe à 6h15 du lundi au vendredi, 6h30 le samedi. Messes du soir le mercredi et le vendredi à 18h30. Adoration le jeudi à 18h00. Confessions le samedi de 16h00 à 17h30.',
      '# Annonces',
      '- Les inscriptions à la catéchèse se poursuivent au secrétariat et sur le site de la paroisse.',
      '- La collecte pour la nouvelle salle paroissiale continue : merci pour votre générosité.',
      '- Répétition des chorales : mercredi et vendredi à 19h00.',
      '- Les intentions de messe sont reçues au secrétariat ou en ligne.',
      '# Prions pour',
      'Les malades de notre communauté, les familles en deuil, les enfants qui commencent la catéchèse et tous ceux qui se sont recommandés à nos prières.',
      '',
      'Document d\'exemple : il sera remplacé par le véritable bulletin de la paroisse.',
    ]);
    const f = await storeUpload(uploadDir, pdf, `bulletin-exemple-${sunday.toISOString().slice(0, 10)}.pdf`);
    const m = await prisma.media.create({ data: f });
    note('media', m.id);
    const row = await prisma.bulletin.create({ data: { title: `Bulletin du dimanche ${day}`, date: sunday, fileId: m.id, status: 'PUBLISHED', publishedAt: new Date(sunday.getTime() - 12 * 3_600_000) } });
    note('bulletin', row.id);
  }
}

async function albums() {
  if (has('album')) return;
  type Pic = [SceneKind, 'dawn' | 'day' | 'dusk' | 'night', string];
  const feast = nextFeast();
  const lastFeast = new Date(Date.UTC(feast.getUTCFullYear() - 1, 11, 13));
  const list: { title: string; slug: string; description: string; date: Date; pics: Pic[] }[] = [
    {
      title: 'Messe de rentrée pastorale',
      slug: 'messe-de-rentree-pastorale',
      description: 'Envoi en mission des groupes et mouvements pour la nouvelle année.',
      date: at(-10),
      pics: [['assembly', 'day', 'L’assemblée pendant la prière eucharistique'], ['church', 'day', 'L’église au matin de la rentrée'], ['window', 'day', 'Le vitrail du chœur'], ['feast', 'day', 'Le verre de l’amitié dans la cour'], ['assembly', 'dawn', 'Bénédiction des catéchistes'], ['church', 'dusk', 'Fin de journée sur le parvis']],
    },
    {
      title: 'Sortie des jeunes à la plage',
      slug: 'sortie-des-jeunes-a-la-plage',
      description: 'Une journée de détente, de jeux et de prière au bord de l’océan.',
      date: at(-45),
      pics: [['beach', 'day', 'Arrivée à la plage de Baguida'], ['beach', 'dawn', 'Prière du matin face à l’océan'], ['feast', 'day', 'Jeux par équipes'], ['beach', 'dusk', 'Coucher de soleil sur les pirogues'], ['procession', 'night', 'Veillée autour du feu']],
    },
    {
      title: 'Fête patronale de Sainte Lucie',
      slug: 'fete-patronale-de-sainte-lucie',
      description: 'Messe solennelle, procession aux flambeaux et repas fraternel.',
      date: lastFeast,
      pics: [['church', 'dawn', 'L’église au lever du jour'], ['assembly', 'dusk', 'La messe solennelle'], ['procession', 'night', 'La procession aux flambeaux'], ['feast', 'dusk', 'La cour décorée pour la fête'], ['window', 'night', 'Les vitraux illuminés'], ['procession', 'dusk', 'Les fidèles en marche vers l’église']],
    },
  ];
  let seed = 100;
  for (const a of list) {
    const album = await prisma.album.create({ data: { title: a.title, slug: a.slug, description: a.description, date: a.date, status: 'PUBLISHED' } });
    note('album', album.id);
    let order = 0;
    for (const [kind, palette, caption] of a.pics) {
      const m = await image(kind, palette, ++seed, caption);
      await prisma.albumItem.create({ data: { albumId: album.id, mediaId: m.id, caption, sortOrder: ++order } });
      if (order === 1) await prisma.album.update({ where: { id: album.id }, data: { coverId: m.id } });
    }
  }
}

async function campaigns() {
  if (has('campaign')) return;
  const list = [
    {
      title: 'Construction de la salle paroissiale',
      slug: 'salle-paroissiale',
      description: 'Une salle polyvalente de 300 places pour la catéchèse, les réunions, les formations et les fêtes de famille. Les fondations sont terminées : aidez-nous à élever les murs.',
      goalAmount: 15_000_000,
      gifts: [500_000, 250_000, 1_000_000, 100_000, 50_000, 25_000, 150_000, 2_000_000, 75_000, 300_000, 10_000, 1_200_000, 60_000, 200_000, 500_000],
    },
    {
      title: 'Panier de Noël pour les familles démunies',
      slug: 'panier-de-noel',
      description: 'Avec la Caritas paroissiale, offrons un panier de vivres à cent familles du quartier pour les fêtes de fin d’année.',
      goalAmount: 1_500_000,
      gifts: [25_000, 10_000, 50_000, 5_000, 100_000, 15_000, 20_000, 200_000, 5_000, 30_000, 75_000],
    },
  ];
  const donors = ['Famille AMOUZOU', 'Donateur anonyme', 'Chorale Sainte Cécile', 'M. et Mme LAWSON', 'Donateur anonyme', 'Communauté de quartier Saint-Michel', 'Mme ADJOVI', 'Un ami de la paroisse', 'Famille KOUDOSSOU', 'Donateur anonyme'];
  const methods = ['MOBILE_MONEY', 'MOBILE_MONEY', 'CARD', 'MOBILE_MONEY'];
  let n = 0;
  for (const c of list) {
    const { gifts, ...data } = c;
    const camp = await prisma.campaign.create({ data: { ...data, status: 'PUBLISHED', startsAt: at(-60) } });
    note('campaign', camp.id);
    for (const amount of gifts) {
      n++;
      const paidAt = at(-(n * 3) % 55, 9 + (n % 9), (n * 7) % 60);
      const row = await prisma.donation.create({
        data: {
          reference: `DEMO-${String(n).padStart(4, '0')}`, amount, currency: 'XOF', status: 'SUCCEEDED', method: methods[n % methods.length], provider: 'mock',
          donorName: donors[n % donors.length], note: 'Exemple de démonstration', campaignId: camp.id, paidAt, createdAt: paidAt,
        },
      });
      note('donation', row.id);
    }
  }
}

async function submissions() {
  if (has('submission')) return;
  const list = [
    { type: 'CONTACT', fullName: 'Kossiwa ATTIOGBE', email: 'kossiwa.attiogbe@example.test', phone: '+228 90 11 22 33', days: 0, payload: { fullName: 'Kossiwa ATTIOGBE', email: 'kossiwa.attiogbe@example.test', phone: '+228 90 11 22 33', subject: 'Certificat de baptême', message: 'Bonjour, j’ai été baptisée dans votre paroisse et j’aurais besoin d’un certificat de baptême pour mon mariage. Quelles sont les pièces à fournir et les jours où je peux passer ? Merci d’avance.' } },
    { type: 'CATECHISM', fullName: 'Komlan EDOH', email: null, phone: '+228 91 22 33 44', days: 1, payload: { childName: 'Grâce EDOH', birthDate: '2017-03-14', level: 'Première communion', parentName: 'Komlan EDOH', phone: '+228 91 22 33 44', message: 'Ma fille a déjà suivi l’éveil à la foi l’an dernier.' } },
    { type: 'SACRAMENT', fullName: 'Ayélé et Mawuko', email: 'fiances@example.test', phone: null, days: 3, payload: { sacrament: 'MARRIAGE', fullName: 'Ayélé et Mawuko', email: 'fiances@example.test', preferredDate: 'Courant du mois d’août', message: 'Nous souhaitons nous marier à la paroisse l’été prochain et commencer la préparation dès que possible.' } },
    { type: 'MASS_INTENTION', fullName: 'Famille GBEDEMAH', email: null, phone: '+228 92 33 44 55', days: 5, status: 'PROCESSED', payload: { fullName: 'Famille GBEDEMAH', phone: '+228 92 33 44 55', intentionType: 'DECEASED', intention: 'Pour le repos de l’âme de notre père, rappelé à Dieu il y a un an.', preferredDate: at(6).toISOString().slice(0, 10) } },
    { type: 'MEMBERSHIP', fullName: 'Edem FOLLY', email: 'edem.folly@example.test', phone: '+228 93 44 55 66', days: 8, status: 'PROCESSED', payload: { fullName: 'Edem FOLLY', email: 'edem.folly@example.test', phone: '+228 93 44 55 66', neighborhood: 'Baguida plage', message: 'Je viens d’emménager dans le quartier et j’aimerais rejoindre la chorale.' } },
  ] as const;
  for (const s of list) {
    const row = await prisma.formSubmission.create({
      data: { type: s.type, fullName: s.fullName, email: s.email, phone: s.phone, payload: s.payload, status: 'status' in s ? s.status : 'NEW', createdAt: at(-s.days, 10, 20) },
    });
    note('submission', row.id);
  }
}

try {
  if (process.argv.includes('--clear')) {
    await clear();
  } else {
    // Enregistré après chaque étape : une interruption ne laisse pas de contenu « orphelin ».
    for (const step of [settings, pages, announcements, schedules, staff, events, homilies, bulletins, albums, campaigns, submissions]) {
      await step();
      await saveManifest();
    }
    console.log('Contenu de démonstration prêt.');
  }
} finally {
  await prisma.$disconnect();
}
