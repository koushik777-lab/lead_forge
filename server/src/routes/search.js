import { Router } from "express";

const router = Router();

router.get("/businesses", async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const outscraperApiKey = process.env.OUTSCRAPER_API_KEY;
  const serpapiApiKey = process.env.SERPAPI_KEY;

  if (!outscraperApiKey && !serpapiApiKey) {
    return res.status(500).json({ error: "Neither OUTSCRAPER_API_KEY nor SERPAPI_KEY is configured." });
  }

  try {
    const query = q.trim();
    let allResults = [];

    if (outscraperApiKey) {
      // 🚀 OUTSCRAPER INTEGRATION (Highly Scalable & Fast - Fetch 60 leads in 1 API call!)
      const limit = 60;
      const url = `https://api.outscraper.cloud/google-maps-search?query=${encodeURIComponent(query)}&limit=${limit}&async=false`;

      console.log(`Searching via Outscraper for: "${query}"`);
      const response = await fetch(url, {
        headers: {
          "X-API-KEY": outscraperApiKey,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Outscraper API error:", text);
        return res.status(502).json({ error: "Outscraper Search API error", details: text });
      }

      const data = await response.json();
      // Outscraper returns an array of arrays (one sub-array per query)
      const localResults = data[0] || [];

      allResults = localResults.map((item) => {
        // Safe mapping of hours
        let hoursString = "";
        if (item.hours) {
          hoursString = typeof item.hours === "string" ? item.hours : JSON.stringify(item.hours);
        }

        return {
          type: "local",
          name: item.name || "",
          address: item.full_address || item.address || "",
          phone: item.phone || "",
          website: item.site || item.website || "",
          rating: item.rating ?? null,
          reviews: item.reviews ?? null,
          category: item.type || item.category || "",
          hours: hoursString,
          thumbnail: item.photo || item.thumbnail || "",
          placeId: item.place_id || "",
          googleMapsLink: item.place_id 
            ? `https://www.google.com/maps/place/?q=place_id:${item.place_id}` 
            : (item.google_id || ""),
        };
      });

    } else {
      // 🛡️ LEGACY SERPAPI FALLBACK (Requires multiple slow page loops)
      let start = 0;
      let hasMore = true;
      let pagesFetched = 0;
      const MAX_PAGES = 3; // Safety limit: 3 pages = 60 results

      console.log(`Searching via Legacy SerpApi for: "${query}"`);
      while (hasMore && pagesFetched < MAX_PAGES) {
        const params = new URLSearchParams({
          engine: "google_maps",
          q: query,
          api_key: serpapiApiKey,
          start: start.toString(),
          hl: "en",
        });

        const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

        if (!response.ok) {
          const text = await response.text();
          console.error(`SerpAPI error (start=${start}):`, text);
          if (pagesFetched === 0) {
            return res.status(502).json({ error: "Search API error", details: text });
          }
          break;
        }

        const data = await response.json();
        const localResults = data.local_results || [];

        if (localResults.length === 0) {
          hasMore = false;
          break;
        }

        // Filter duplicates by place_id
        const newItems = localResults.filter(
          (item) => !allResults.some((existing) => existing.placeId === (item.place_id || item.fid))
        );

        if (newItems.length === 0) {
          hasMore = false;
          break;
        }

        // Map to our UI format
        const mappedItems = newItems.map((item) => ({
          type: "local",
          name: item.title || item.name || "",
          address: item.address || "",
          phone: item.phone || "",
          website: item.website || item.links?.website || "",
          rating: item.rating ?? null,
          reviews: item.reviews ?? null,
          category: item.type || item.category || item.extensions?.[0] || "",
          hours: item.hours || "",
          thumbnail: item.thumbnail || "",
          placeId: item.place_id || item.fid || "",
          googleMapsLink: item.links?.directions || item.gps_coordinates || "",
        }));

        allResults.push(...mappedItems);

        start += 20;
        pagesFetched++;

        // If there's no serpapi_pagination or next page, stop
        if (!data.serpapi_pagination?.next) {
          hasMore = false;
        }
      }
    }

    return res.json({
      query,
      total: allResults.length,
      results: allResults,
    });
  } catch (err) {
    console.error("Search internal error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

export default router;
