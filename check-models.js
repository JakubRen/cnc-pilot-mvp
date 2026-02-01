const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);

    if (!match) {
        console.error("Nie znaleziono klucza API w pliku .env.local");
        process.exit(1);
    }

    const apiKey = match[1].trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log("Pobieranie listy modeli...");

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.models) {
                console.log("\nDostępne modele Gemini:");
                data.models.forEach(model => {
                    if (model.name.includes('gemini')) {
                        console.log(model.name.replace('models/', ''));
                    }
                });
            } else {
                console.error("Błąd API:", data);
            }
        })
        .catch(err => console.error("Błąd połączenia:", err));

} catch (err) {
    console.error("Błąd odczytu pliku:", err.message);
}