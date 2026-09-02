// This script is made to run with NodeJS. It is very crude and shouldn't be automated.
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

// Replace with your Steam64 ID (steamid.io)
const STEAM_ID_64 = '00000000000000000'; 
const COUNT_PER_PAGE = 10;

async function fetchPage(start) {
  const url = `https://steamcommunity.com/comment/Profile/render/${STEAM_ID_64}/-1/?start=${start}&count=${COUNT_PER_PAGE}`;
  const res = await axios.get(url);
  return res.data;
}

async function scrapeAllComments() {
  let allComments = [];
  let start = 0;
  let totalCount = 1;

  console.log('Starting Steam comment scrape...');

  while (start < totalCount) {
    try {
      console.log(`Fetching comments ${start} to ${start + COUNT_PER_PAGE}...`);
      const data = await fetchPage(start);
      
      if (!data || !data.comments_html) break;

      totalCount = data.total_count || 0;
      const $ = cheerio.load(data.comments_html);

      $('.commentthread_comment').each((_, el) => {
  const avatar = $(el)
    .find('.playerAvatar img, .commentthread_comment_avatar img')
    .not('[src*="/items/"]') // Ignores animated borders
    .not('.profile_avatar_frame img') // Ignores static frames
    .first()
    .attr('src');
  const author = $(el).find('.commentthread_author_link').text().trim();
  const profileUrl = $(el).find('.commentthread_author_link').attr('href');
  const date = $(el).find('.commentthread_comment_timestamp').text().trim();
  
  const textEl = $(el).find('.commentthread_comment_text').clone();
  textEl.find('img').remove(); 
  const text = textEl.text().trim();

  allComments.push({ avatar, author, profileUrl, date, text });
});

      start += COUNT_PER_PAGE;
      
      // A delay to avoid getting rate limited by Steam
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Error scraping at index ${start}:`, err.message);
      break;
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    totalComments: allComments.length,
    comments: allComments
  };

  fs.writeFileSync('comments.json', JSON.stringify(payload, null, 2));
  console.log(`\nSuccess! Saved ${allComments.length} comments to comments.json`);
}

scrapeAllComments();
