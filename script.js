/* =====================================================================
   KSA Best — script.js (النسخة المحدثة والمصلحة بالكامل)
   موقع أفلام ومسلسلات يعتمد على بيانات TMDB (بوسترات + تفاصيل + بث مباشر)
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) إعدادات الـ API
--------------------------------------------------------------------- */
const TMDB_API_KEY = "26097366152d7131fde0f53b80ee37de";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

/* ---------------------------------------------------------------------
   2) عناصر DOM
--------------------------------------------------------------------- */
const trendingGrid   = document.getElementById("trending-grid");
const moviesGrid     = document.getElementById("movies-grid");
const seriesGrid     = document.getElementById("series-grid");

const searchInput    = document.getElementById("search-input");
const searchResults  = document.getElementById("search-results");

const loadingIndicator = document.getElementById("loading-indicator");

const modalOverlay   = document.getElementById("modal-overlay");
const modalCloseBtn  = document.getElementById("modal-close-btn");
const modalTitle     = document.getElementById("modal-title");
const modalOverview  = document.getElementById("modal-overview");
const modalRating    = document.getElementById("modal-rating");
const modalDate      = document.getElementById("modal-date");
const modalType      = document.getElementById("modal-type");
const videoPlayer    = document.getElementById("video-player");

const seriesControls = document.getElementById("series-controls");
const seasonSelect   = document.getElementById("season-select");
const episodeSelect  = document.getElementById("episode-select");
const playEpisodeBtn = document.getElementById("play-episode-btn");

const mainHeader     = document.getElementById("main-header");

/* ---------------------------------------------------------------------
   3) حالة عامة لتخزين بيانات العمل المفتوح حالياً داخل الـ Modal
--------------------------------------------------------------------- */
let currentMediaState = {
    id: null,
    mediaType: null,   // "movie" أو "tv"
    title: null,
    seasonNumber: 1,
    episodeNumber: 1
};

/* =====================================================================
   3.5) التحكم بسكربت الإعلانات (Popunder) — يعمل حسب حالة الـ Modal
   لا يتم تحميل الإعلان أثناء فتح الفيلم/المسلسل، ويعود تلقائياً
   عند إغلاق النافذة المنبثقة.
   ===================================================================== */
const AD_SCRIPT_SRC = 'https://quge5.com/88/tag.min.js';
const AD_SCRIPT_ID = 'popunder-ad-script';
let isModalOpen = false;

function loadAdScript() {
    if (document.getElementById(AD_SCRIPT_ID)) return; // محمّل أصلاً
    const s = document.createElement('script');
    s.src = AD_SCRIPT_SRC;
    s.id = AD_SCRIPT_ID;
    s.async = true;
    document.head.appendChild(s);
}

function removeAdScript() {
    const s = document.getElementById(AD_SCRIPT_ID);
    if (s) s.parentNode.removeChild(s);
}

// طبقة حماية إضافية: تمنع أي نقرة من تفعيل أي مستمع إعلاني سابق
// طالما الـ Modal مفتوح، حتى لو كان السكربت قد حُمّل قبل فتح الفيلم
document.addEventListener('click', function (e) {
    if (isModalOpen) {
        e.stopImmediatePropagation();
    }
}, true);

/* =====================================================================
   4) دوال جلب البيانات من TMDB
   ===================================================================== */

// جلب الأعمال الرائجة اليوم (أفلام + مسلسلات)
async function fetchTrending() {
    try {
        const url = `${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        const data = await res.json();
        renderGrid(data.results, trendingGrid);
    } catch (err) {
        console.error("خطأ في جلب الرائج اليوم:", err);
    }
}

// جلب أحدث الأفلام
async function fetchMovies() {
    try {
        const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.results.map(item => ({ ...item, media_type: "movie" }));
        renderGrid(results, moviesGrid);
    } catch (err) {
        console.error("خطأ في جلب الأفلام:", err);
    }
}

// جلب أحدث المسلسلات
async function fetchSeries() {
    try {
        const url = `${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.results.map(item => ({ ...item, media_type: "tv" }));
        renderGrid(results, seriesGrid);
    } catch (err) {
        console.error("خطأ في جلب المسلسلات:", err);
    }
}

// البحث الذكي أثناء الكتابة (أفلام ومسلسلات معاً)
async function searchMulti(query) {
    try {
        const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        const filtered = data.results.filter(item => item.media_type === "movie" || item.media_type === "tv");
        renderSearchResults(filtered);
    } catch (err) {
        console.error("خطأ في البحث:", err);
    }
}

async function fetchDetailsInArabic(id, mediaType) {
    const url = `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=ar-SA`;
    const res = await fetch(url);
    return await res.json();
}

async function fetchDetailsInEnglish(id, mediaType) {
    const url = `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=en-US`;
    const res = await fetch(url);
    return await res.json();
}

async function fetchVideos(id, mediaType) {
    const url = `${TMDB_BASE_URL}/${mediaType}/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

async function fetchSeasonDetails(tvId, seasonNumber) {
    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
    const res = await fetch(url);
    return await res.json();
}

/* =====================================================================
   5) دوال العرض (Rendering)
   ===================================================================== */

function renderGrid(items, container) {
    container.innerHTML = "";
    items.forEach(item => {
        if (!item.poster_path && !item.title && !item.name) return;

        const title = item.title || item.name || "بدون عنوان";
        const mediaType = item.media_type || (item.title ? "movie" : "tv");
        const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";

        const card = document.createElement("div");
        card.className = "poster-card";
        card.dataset.id = item.id;
        card.dataset.type = mediaType;

        const posterHtml = item.poster_path
            ? `<img src="${IMAGE_BASE_URL}${item.poster_path}" alt="${title}" loading="lazy">`
            : `<div class="poster-placeholder">${title}</div>`;

        card.innerHTML = `
            ${posterHtml}
            <div class="poster-overlay">
                <div class="play-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
                <h3>${title}</h3>
                <span class="text-yellow-400 text-xs font-bold">★ ${rating}</span>
            </div>
        `;

        card.addEventListener("click", () => openModal(item.id, mediaType));
        container.appendChild(card);
    });
}

function renderSearchResults(items) {
    if (items.length === 0) {
        searchResults.classList.add("hidden");
        searchResults.innerHTML = "";
        return;
    }

    searchResults.innerHTML = "";
    items.slice(0, 8).forEach(item => {
        const title = item.title || item.name || "بدون عنوان";
        const mediaType = item.media_type;

        const div = document.createElement("div");
        div.className = "search-result-item";
        div.innerHTML = `
            ${item.poster_path
                ? `<img src="${IMAGE_BASE_URL}${item.poster_path}" alt="${title}">`
                : `<div class="poster-placeholder" style="width:40px;height:58px;font-size:0.55rem;">لا يوجد</div>`}
            <div>
                <p class="text-sm font-bold text-white">${title}</p>
                <p class="text-xs text-gray-400">${mediaType === "movie" ? "فيلم" : "مسلسل"}</p>
            </div>
        `;

        div.addEventListener("click", () => {
            openModal(item.id, mediaType);
            searchResults.classList.add("hidden");
            searchInput.value = "";
        });

        searchResults.appendChild(div);
    });

    searchResults.classList.remove("hidden");
}

/* =====================================================================
   6) بناء رابط الفيديو (Iframe) المصلح تماماً لـ KSA Best
   ===================================================================== */
function buildVideoUrl() {
    const id = currentMediaState.id;
    const type = currentMediaState.mediaType;
    
    if (type === 'tv') {
        const season = seasonSelect ? seasonSelect.value : 1;
        const episode = episodeSelect ? episodeSelect.value : 1;
        return `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
    } else {
        return `https://vidsrc.to/embed/movie/${id}`;
    }
}

function pickBestTrailer(videos) {
    if (!videos || videos.length === 0) return null;
    const officialTrailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official);
    if (officialTrailer) return officialTrailer.key;
    const anyTrailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer");
    if (anyTrailer) return anyTrailer.key;
    return null;
}

/* =====================================================================
   7) منطق فتح وتشغيل النافذة المنبثقة (Modal)
   ===================================================================== */
async function openModal(id, mediaType) {
    // إيقاف الإعلانات فور فتح الفيلم/المسلسل
    isModalOpen = true;
    removeAdScript();

    showLoading(true);

    try {
        currentMediaState = {
            id: id,
            mediaType: mediaType,
            title: null,
            seasonNumber: 1,
            episodeNumber: 1
        };

        const arabicDetails = await fetchDetailsInArabic(id, mediaType);
        const englishDetails = await fetchDetailsInEnglish(id, mediaType);

        const title = arabicDetails.title || arabicDetails.name || englishDetails.title || englishDetails.name || "بدون عنوان";
        const overview = (arabicDetails.overview && arabicDetails.overview.trim().length > 0)
            ? arabicDetails.overview
            : (englishDetails.overview || "لا توجد قصة متاحة لهذا العمل حالياً.");

        const releaseDate = arabicDetails.release_date || arabicDetails.first_air_date || "—";
        const rating = arabicDetails.vote_average ? arabicDetails.vote_average.toFixed(1) : "—";

        currentMediaState.title = title;

        modalTitle.textContent = title;
        modalOverview.textContent = overview;
        modalRating.textContent = `★ ${rating}`;
        modalDate.textContent = releaseDate;
        modalType.textContent = mediaType === "movie" ? "فيلم" : "مسلسل";

        if (mediaType === "tv") {
            seriesControls.classList.remove("hidden");
            await setupSeasonsAndEpisodes(id);
            await playEpisodeStream();
        } else {
            seriesControls.classList.add("hidden");
            // تشغيل الفيلم فوراً عبر رابط البث
            player.source = {
    type: 'video',
    sources: [{ src: buildVideoUrl(id, mediaType), type: 'video/mp4' }]
};
player.play();

        }

        modalOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";

    } catch (err) {
        console.error("خطأ في فتح النافذة المنبثقة:", err);
    } finally {
        showLoading(false);
    }
}

function closeModal() {
    modalOverlay.classList.add("hidden");
    videoPlayer.src = ""; 
    document.body.style.overflow = "auto";

    // إعادة تفعيل الإعلانات بعد الخروج من الفيلم/المسلسل
    isModalOpen = false;
    loadAdScript();
}

async function setupSeasonsAndEpisodes(tvId) {
    try {
        const englishDetails = await fetchDetailsInEnglish(tvId, "tv");
        const seasons = (englishDetails.seasons || []).filter(s => s.season_number > 0);

        seasonSelect.innerHTML = "";
        seasons.forEach(season => {
            const option = document.createElement("option");
            option.value = season.season_number;
            option.textContent = `الموسم ${season.season_number}`;
            seasonSelect.appendChild(option);
        });

        if (seasons.length === 0) {
            const option = document.createElement("option");
            option.value = 1;
            option.textContent = "الموسم 1";
            seasonSelect.appendChild(option);
        }

        seasonSelect.value = 1; 
        currentMediaState.seasonNumber = 1;

        await populateEpisodes(tvId, 1);

    } catch (err) {
        console.error("خطأ في إعداد المواسم:", err);
    }
}

async function populateEpisodes(tvId, seasonNumber) {
    try {
        const seasonData = await fetchSeasonDetails(tvId, seasonNumber);
        const episodes = seasonData.episodes || [];

        episodeSelect.innerHTML = "";
        episodes.forEach(ep => {
            const option = document.createElement("option");
            option.value = ep.episode_number;
            option.textContent = `الحلقة ${ep.episode_number} - ${ep.name || ""}`;
            episodeSelect.appendChild(option);
        });

        if (episodes.length === 0) {
            const option = document.createElement("option");
            option.value = 1;
            option.textContent = "الحلقة 1";
            episodeSelect.appendChild(option);
        }

        episodeSelect.value = 1; 
        currentMediaState.episodeNumber = 1;

    } catch (err) {
        console.error("خطأ في تعبئة الحلقات:", err);
    }
}

// دالة تشغيل البث المباشر للمسلسلات
async function playEpisodeStream() {
    videoPlayer.src = buildVideoUrl();
}

/* =====================================================================
   8) ربط الأحداث (Event Listeners)
   ===================================================================== */
modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

seasonSelect.addEventListener("change", async () => {
    const seasonNumber = parseInt(seasonSelect.value, 10);
    currentMediaState.seasonNumber = seasonNumber;
    showLoading(true);
    await populateEpisodes(currentMediaState.id, seasonNumber);
    showLoading(false);
    // تحديث البث تلقائياً عند تغيير الموسم
    playEpisodeStream();
});

episodeSelect.addEventListener("change", () => {
    currentMediaState.episodeNumber = parseInt(episodeSelect.value, 10);
    // تحديث البث تلقائياً عند تغيير الحلقة
    playEpisodeStream();
});

playEpisodeBtn.addEventListener("click", () => {
    currentMediaState.episodeNumber = parseInt(episodeSelect.value, 10);
    currentMediaState.seasonNumber = parseInt(seasonSelect.value, 10);
    playEpisodeStream();
});

let searchTimeout = null;
searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    clearTimeout(searchTimeout);

    if (query.length < 2) {
        searchResults.classList.add("hidden");
        searchResults.innerHTML = "";
        return;
    }

    searchTimeout = setTimeout(() => {
        searchMulti(query);
    }, 400);
});

document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add("hidden");
    }
});

window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        mainHeader.classList.add("header-scrolled");
    } else {
        mainHeader.classList.remove("header-scrolled");
    }
});

function showLoading(state) {
    if (state) {
        loadingIndicator.classList.remove("hidden");
    } else {
        loadingIndicator.classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchTrending();
    fetchMovies();
    fetchSeries();
    loadAdScript(); // تحميل الإعلان في الصفحة الرئيسية فقط
});
