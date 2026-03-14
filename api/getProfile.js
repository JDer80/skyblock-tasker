export default async function handler(req, res) {
    // 1. On autorise ton futur site à discuter avec cette API (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // 2. On récupère le pseudo ou l'UUID du joueur que tu demanderas
    const { uuid } = req.query;

    // 3. On récupère ta clé secrète (qui sera cachée sur Vercel)
    const apiKey = process.env.HYPIXEL_API_KEY;

    if (!uuid) {
        return res.status(400).json({ error: "Il manque l'UUID du joueur dans la demande." });
    }

    try {
        // 4. On pose la question à Hypixel avec ta clé secrète
        const response = await fetch(`https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`, {
            headers: {
                'API-Key': apiKey
            }
        });

        const data = await response.json();

        // 5. On renvoie les données propres à ton site web
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Erreur lors de la communication avec Hypixel." });
    }
}