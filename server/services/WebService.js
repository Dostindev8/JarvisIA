const MAX_TEXT = 12000;
const FETCH_TIMEOUT = 15000;

const BLOCKED_HOSTS = /^localhost$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./;

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  ).slice(0, MAX_TEXT);
}

function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Solo URLs http/https');
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.test(host) || host === '0.0.0.0') {
    throw new Error('URL no permitida por seguridad');
  }

  return parsed.href;
}

function parseDuckLite(html, limit) {
  const results = [];
  const linkRegex =
    /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
  const matches = [...html.matchAll(linkRegex)];

  matches.slice(0, limit).forEach((match) => {
    const url = match[1];
    const title = stripHtml(match[2]).slice(0, 200);
    const after = html.slice(match.index, match.index + 1200);
    const snippetMatch = after.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/i);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 400) : '';
    if (title && url) {
      results.push({ title, url, snippet, source: 'duckduckgo' });
    }
  });

  return results;
}

async function searchWikipedia(query, limit = 3) {
  try {
    const res = await fetch(
      `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${limit}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT) }
    );
    const data = await res.json();
    const items = data.query?.search || [];

    return items.map((item) => ({
      title: item.title,
      url: `https://es.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: stripHtml(item.snippet),
      source: 'wikipedia'
    }));
  } catch {
    return [];
  }
}

async function searchWeb(query, limit = 8) {
  const results = [];
  const seen = new Set();

  const add = (item) => {
    if (!item.url || seen.has(item.url)) return;
    seen.add(item.url);
    results.push(item);
  };

  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT) }
    );
    const data = await ddgRes.json();

    if (data.AbstractText && data.AbstractURL) {
      add({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: 'duckduckgo-instant'
      });
    }

    const topics = [...(data.RelatedTopics || [])];
    for (const topic of topics) {
      if (topic.FirstURL && topic.Text) {
        add({
          title: topic.Text.split(' - ')[0]?.slice(0, 120) || query,
          url: topic.FirstURL,
          snippet: topic.Text.slice(0, 400),
          source: 'duckduckgo-related'
        });
      }
      if (topic.Topics) {
        topic.Topics.forEach((sub) => {
          if (sub.FirstURL) {
            add({
              title: sub.Text?.split(' - ')[0]?.slice(0, 120) || query,
              url: sub.FirstURL,
              snippet: sub.Text?.slice(0, 400) || '',
              source: 'duckduckgo-related'
            });
          }
        });
      }
      if (results.length >= limit) break;
    }
  } catch (err) {
    console.warn('[WebSearch] DuckDuckGo instant:', err.message);
  }

  if (results.length < limit) {
    try {
      const liteRes = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(FETCH_TIMEOUT)
      });
      const html = await liteRes.text();
      parseDuckLite(html, limit).forEach(add);
    } catch (err) {
      console.warn('[WebSearch] DuckDuckGo lite:', err.message);
    }
  }

  if (results.length < limit) {
    const wiki = await searchWikipedia(query, limit - results.length);
    wiki.forEach(add);
  }

  return {
    query,
    count: results.slice(0, limit).length,
    results: results.slice(0, limit)
  };
}

async function fetchWebPage(url) {
  const safeUrl = validateUrl(url);

  const res = await fetch(safeUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JarvisBot/1.0; +https://logiccode.do)',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es,en;q=0.8'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al acceder a la página`);
  }

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  let title = safeUrl;
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = stripHtml(titleMatch[1]).slice(0, 200);

  const text = contentType.includes('html') ? stripHtml(raw) : raw.slice(0, MAX_TEXT);

  return {
    url: safeUrl,
    title,
    content: text,
    length: text.length,
    fetchedAt: new Date().toISOString()
  };
}

module.exports = { searchWeb, fetchWebPage, stripHtml };
