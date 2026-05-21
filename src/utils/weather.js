export async function geocodeCity(city) {
    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`
    );
    const data = await res.json();
    if (!data.results?.length) return null;
    const { latitude, longitude, name, country } = data.results[0];
    return { lat: latitude, lon: longitude, name, country };
}

export async function fetchMatchWeather(lat, lon, date) {
    const today = new Date().toISOString().split("T")[0];
    const isHistorical = date <= today;

    const base = isHistorical
        ? "https://archive-api.open-meteo.com/v1/archive"
        : "https://api.open-meteo.com/v1/forecast";

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        start_date: date,
        end_date: date,
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
        timezone: "auto",
    });

    const res = await fetch(`${base}?${params}`);
    const data = await res.json();
    if (!data.daily) return null;

    const temp    = data.daily.temperature_2m_max[0];
    const tempMin = data.daily.temperature_2m_min[0];
    const rain    = data.daily.precipitation_sum[0];
    const wind    = data.daily.wind_speed_10m_max[0];

    let condition = "Despejado";
    if (rain > 5)       condition = "Lluvia";
    else if (rain > 1)  condition = "Llovizna";
    else if (wind > 40) condition = "Viento fuerte";
    else if (wind > 25) condition = "Ventoso";

    return { temp, tempMin, rain, wind, condition };
}

export async function getWeatherForMatch(city, date) {
    const geo = await geocodeCity(city);
    if (!geo) return null;
    const weather = await fetchMatchWeather(geo.lat, geo.lon, date);
    if (!weather) return null;
    return { ...weather, city: geo.name, country: geo.country };
}
